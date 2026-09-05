import {
    Consumer,
    EventEnvelope,
    EventStream,
    EventType,
    JsonValue,
    SimulationState,
    SimulationStep,
    StoreState,
    StreamConnection,
} from '../types';
import { applyRestrictedTransform, evaluateCondition } from '../lib/safeExpressions';

const INITIAL_SIM: SimulationState = {
    active: false,
    currentStreamId: null,
    currentConsumerId: null,
    currentEdgeId: null,
    visitedStreamIds: [],
    visitedConsumerIds: [],
    activeEdgeIds: [],
    cycleEdges: [],
    eventLog: [],
    speed: 1000,
    maxLoops: 1,
    totalSteps: 0,
    currentStep: 0,
    steps: [],
};

interface QueueItem extends EventEnvelope {
    viaEdge: string | null;
    visits: Record<string, number>;
}

interface DispatchTarget {
    sinkId: string;
    payload: JsonValue;
    eventTypeId?: string;
}

interface BuildSimulationOptions {
    random?: () => number;
}

const connectionTargets = (
    connection: StreamConnection,
    payload: JsonValue,
    fallbackEventTypeId?: string
): DispatchTarget[] => {
    const eventIds = connection.eventIds?.length ? connection.eventIds : [fallbackEventTypeId];
    return eventIds.map(eventTypeId => ({
        sinkId: connection.streamId,
        payload,
        ...(eventTypeId ? { eventTypeId } : {}),
    }));
};

export const buildSimSteps = (
    startStreamId: string,
    streams: EventStream[],
    consumers: Consumer[],
    events: EventType[],
    payloads: JsonValue[],
    eventTypeId: string | undefined,
    maxLoops: number,
    generateEventPayload: (input: JsonValue, consumerName: string, events: EventType[]) => JsonValue,
    options: BuildSimulationOptions = {}
): SimulationStep[] => {
    const steps: SimulationStep[] = [];
    const random = options.random ?? Math.random;
    const loopLimit = Math.max(1, Math.min(100, Math.floor(maxLoops) || 1));
    const globalStepCap = 10000;
    let globalSteps = 0;

    for (let payloadIndex = 0; payloadIndex < payloads.length; payloadIndex++) {
        const queue: QueueItem[] = [{
            streamId: startStreamId,
            eventTypeId,
            payload: payloads[payloadIndex],
            path: [startStreamId],
            hopCount: 0,
            viaEdge: null,
            visits: {},
        }];
        let queueIndex = 0;

        while (queueIndex < queue.length) {
            if (++globalSteps > globalStepCap) {
                steps.push({ type: 'warning', message: `⚠️ Safety cap reached after ${globalStepCap} steps.` });
                return steps;
            }

            const item = queue[queueIndex++];
            if (!item) continue;
            const stream = streams.find(candidate => candidate.id === item.streamId);
            if (!stream) continue;

            // An event may legitimately converge with an identical event from another branch.
            // Count visits only along this event's own ancestry, including changing payloads.
            const stateKey = `stream:${item.streamId}:${item.eventTypeId ?? 'generic'}`;
            const visitCount = item.visits[stateKey] ?? 0;
            if (visitCount >= loopLimit) {
                if (item.viaEdge) steps.push({ type: 'warning', message: '', isCycle: true, id: item.viaEdge });
                steps.push({
                    type: 'warning',
                    message: `🔁 Cycle limit reached: stream "${stream.name}" was visited ${visitCount + 1} times along one event path.`,
                    id: item.streamId,
                    eventTypeId: item.eventTypeId,
                });
                continue;
            }

            const visits = { ...item.visits, [stateKey]: visitCount + 1 };
            const event = item.eventTypeId ? events.find(candidate => candidate.id === item.eventTypeId) : undefined;
            const eventLabel = event ? ` [${event.name}]` : '';
            const batchLabel = payloads.length > 1 ? ` [Payload ${payloadIndex + 1}/${payloads.length}]` : '';
            steps.push({
                type: 'stream',
                id: item.streamId,
                message: `📨 ${event?.name ?? 'Event'} arrives at stream: ${stream.name} (${stream.type.toUpperCase()})${batchLabel}`,
                payload: item.payload,
                eventTypeId: item.eventTypeId,
            });

            const matchingConsumers = consumers.flatMap(consumer => {
                const source = (consumer.sources || []).find(connection => connection.streamId === item.streamId);
                if (!source) return [];
                if (item.eventTypeId && source.eventIds.length > 0 && !source.eventIds.includes(item.eventTypeId)) return [];
                return [{ consumer, source }];
            });

            for (const { consumer, source } of matchingConsumers) {
                const consumerKey = `consumer:${consumer.id}:${item.eventTypeId ?? 'generic'}`;
                const consumerVisits = visits[consumerKey] ?? 0;
                if (consumerVisits >= loopLimit) continue;

                let intermediatePayload = item.payload;
                try {
                    intermediatePayload = applyRestrictedTransform(consumer.transformScript, item.payload);
                } catch (error) {
                    steps.push({ type: 'warning', id: consumer.id, message: `❌ Transform error in ${consumer.name}: ${String(error)}` });
                }

                steps.push({ type: 'edge', from: item.streamId, to: consumer.id, message: '', eventTypeId: item.eventTypeId });
                steps.push({
                    type: 'consumer',
                    id: consumer.id,
                    message: `⚡ Consumer processes: ${consumer.name}${eventLabel}`,
                    payload: item.payload,
                    outputPayload: intermediatePayload,
                    eventTypeId: item.eventTypeId,
                });

                const strategy = consumer.routingStrategy || 'broadcast';
                let dispatchTargets: DispatchTarget[] = [];

                if (strategy === 'broadcast') {
                    dispatchTargets = (consumer.sinks || []).flatMap(connection =>
                        connectionTargets(connection, intermediatePayload, item.eventTypeId)
                    );
                } else if (strategy === 'failover') {
                    const failureRate = consumer.failureRate ?? 0.05;
                    const failed = random() < failureRate;
                    if (failed) {
                        if (consumer.dlqSink) {
                            dispatchTargets = connectionTargets(consumer.dlqSink, intermediatePayload, item.eventTypeId);
                            steps.push({ type: 'warning', id: consumer.id, message: `⚠️ Simulated failure in ${consumer.name}; routing to DLQ.` });
                        } else {
                            steps.push({ type: 'warning', id: consumer.id, message: `⚠️ Simulated failure in ${consumer.name}; no DLQ is configured.` });
                        }
                    } else if (consumer.sinks?.[0]) {
                        dispatchTargets = connectionTargets(consumer.sinks[0], intermediatePayload, item.eventTypeId);
                    }
                } else {
                    for (const rule of consumer.routingRules || []) {
                        if (rule.sourceStreamId && rule.sourceStreamId !== item.streamId) continue;
                        if (rule.sourceEventId && rule.sourceEventId !== item.eventTypeId) continue;
                        try {
                            if (!evaluateCondition(rule.condition, intermediatePayload)) continue;
                            let rulePayload = intermediatePayload;
                            try {
                                rulePayload = applyRestrictedTransform(rule.transformScript, intermediatePayload);
                            } catch (error) {
                                steps.push({ type: 'warning', id: rule.id, message: `❌ Rule transform error: ${String(error)}` });
                            }
                            const sinkConnection = consumer.sinks.find(sink => sink.streamId === rule.sinkStreamId);
                            const outputIds = rule.outputEventId
                                ? [rule.outputEventId]
                                : rule.eventIds?.length
                                    ? rule.eventIds
                                    : sinkConnection?.eventIds?.length
                                        ? sinkConnection.eventIds
                                        : [item.eventTypeId];
                            dispatchTargets.push(...outputIds.map(outputId => ({
                                sinkId: rule.sinkStreamId,
                                payload: rulePayload,
                                ...(outputId ? { eventTypeId: outputId } : {}),
                            })));
                        } catch (error) {
                            steps.push({ type: 'warning', id: rule.id, message: `❌ Rule condition error in ${consumer.name}: ${String(error)}` });
                        }
                    }
                    if (dispatchTargets.length === 0) {
                        steps.push({ type: 'warning', message: `Event dropped: no conditions matched at ${consumer.name}`, id: consumer.id });
                    }
                }

                for (const target of dispatchTargets) {
                    const sinkStream = streams.find(candidate => candidate.id === target.sinkId);
                    if (!sinkStream) {
                        steps.push({ type: 'warning', message: `Missing sink stream for ${consumer.name}`, id: target.sinkId });
                        continue;
                    }
                    const outputEvent = target.eventTypeId
                        ? events.find(candidate => candidate.id === target.eventTypeId)
                        : undefined;
                    const finalPayload = generateEventPayload(
                        target.payload,
                        consumer.name,
                        outputEvent ? [outputEvent] : []
                    );
                    if (steps.length + queue.length - queueIndex >= globalStepCap) {
                        steps.push({ type: 'warning', message: `⚠️ Safety cap reached after ${globalStepCap} steps.` });
                        return steps;
                    }
                    steps.push({ type: 'edge', from: consumer.id, to: target.sinkId, message: '', eventTypeId: target.eventTypeId });
                    queue.push({
                        streamId: target.sinkId,
                        eventTypeId: target.eventTypeId,
                        payload: finalPayload,
                        path: [...item.path, consumer.id, target.sinkId],
                        hopCount: item.hopCount + 1,
                        viaEdge: `${consumer.id}->${target.sinkId}`,
                        visits: { ...visits, [consumerKey]: consumerVisits + 1 },
                    });
                }

                // Referencing `source` here documents that the matched connection is intentional,
                // and keeps the event filter adjacent to the selected consumer.
                void source;
            }
        }
    }

    return steps;
};

export const buildSimulationActions = (
    get: () => StoreState,
    set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void,
    generatorDeps: { generateEventPayload: (input: JsonValue, consumerName: string, events: EventType[]) => JsonValue }
) => {
    const getSim = () => get().simulation;

    const startSimulation = (
        startStreamId: string,
        payloadOrPayloads: JsonValue | JsonValue[] = null,
        eventTypeId?: string
    ) => {
        const { streams, consumers, events, simulation } = get();
        const payloads = Array.isArray(payloadOrPayloads) ? payloadOrPayloads : [payloadOrPayloads];
        const steps = buildSimSteps(
            startStreamId,
            streams,
            consumers,
            events,
            payloads,
            eventTypeId,
            simulation.maxLoops || 1,
            generatorDeps.generateEventPayload
        );

        if (steps.length === 0) {
            get().showToast('No matching consumers found for this event');
            return;
        }

        set({
            rightSidebarOpen: true,
            simulation: {
                ...INITIAL_SIM,
                active: true,
                currentStreamId: startStreamId,
                speed: simulation.speed,
                maxLoops: simulation.maxLoops,
                totalSteps: steps.length,
                currentStep: 0,
                steps,
            },
        });
    };

    const advanceSimulation = () => {
        const sim = getSim();
        if (!sim.active || sim.currentStep >= sim.totalSteps) {
            set(state => ({ simulation: { ...state.simulation, active: false } }));
            return false;
        }

        const step = sim.steps[sim.currentStep];
        const updates: Partial<SimulationState> = { currentStep: sim.currentStep + 1, active: sim.currentStep + 1 < sim.totalSteps };

        if (step.type === 'stream' && step.id) {
            updates.currentEdgeId = null;
            updates.currentConsumerId = null;
            updates.currentStreamId = step.id;
            updates.visitedStreamIds = [...new Set([...sim.visitedStreamIds, step.id])];
            updates.eventLog = [...sim.eventLog, {
                time: new Date().toISOString(), type: 'stream', message: step.message, payload: step.payload,
            }];
        } else if (step.type === 'consumer' && step.id) {
            updates.currentEdgeId = null;
            updates.currentConsumerId = step.id;
            updates.currentStreamId = null;
            updates.visitedConsumerIds = [...new Set([...sim.visitedConsumerIds, step.id])];
            updates.eventLog = [...sim.eventLog, {
                time: new Date().toISOString(), type: 'consumer', message: step.message,
                payload: step.payload, outputPayload: step.outputPayload,
            }];
        } else if (step.type === 'edge' && step.from && step.to) {
            const edgeId = `${step.from}->${step.to}`;
            updates.currentEdgeId = edgeId;
            updates.activeEdgeIds = [...new Set([...sim.activeEdgeIds, edgeId])];
        } else if (step.type === 'warning') {
            if (step.isCycle && step.id) {
                updates.cycleEdges = [...new Set([...sim.cycleEdges, step.id])];
            } else {
                updates.eventLog = [...sim.eventLog, {
                    time: new Date().toISOString(), type: 'warning', message: step.message,
                }];
            }
        }

        set(state => ({ simulation: { ...state.simulation, ...updates } }));
        return sim.currentStep + 1 < sim.totalSteps;
    };

    const stopSimulation = () => {
        const sim = getSim();
        set({ simulation: {
            ...INITIAL_SIM,
            speed: sim.speed,
            maxLoops: sim.maxLoops,
            eventLog: sim.eventLog,
        } });
    };

    const clearSimulation = () => {
        const sim = getSim();
        set({ simulation: { ...INITIAL_SIM, speed: sim.speed, maxLoops: sim.maxLoops } });
    };

    const setSimulationSpeed = (speed: number) =>
        set(state => ({ simulation: { ...state.simulation, speed } }));

    const setMaxLoops = (maxLoops: number) =>
        set(state => ({ simulation: { ...state.simulation, maxLoops } }));

    return { startSimulation, advanceSimulation, stopSimulation, clearSimulation, setSimulationSpeed, setMaxLoops };
};

export { INITIAL_SIM };
