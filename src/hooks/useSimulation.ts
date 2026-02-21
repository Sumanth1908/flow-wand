/**
 * hooks/useSimulation.ts
 */
import { SimulationStep, SimulationState, EventStream, Consumer, StoreState } from '../types';

let _steps: SimulationStep[] = [];
let _total = 0;

const INITIAL_SIM: SimulationState = {
    active: false,
    currentStreamId: null,
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

function buildSimSteps(startStreamId: string, streams: EventStream[], consumers: Consumer[], payloads: any[], maxLoops: number) {
    const steps: SimulationStep[] = [];
    const log: any[] = [];
    const ts = () => new Date().toISOString();

    for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        const queue = [{ streamId: startStreamId, currentPayload: payload, viaEdge: null as string | null }];
        const streamVisits = new Map<string, number>();
        const consumerVisits = new Map<string, number>();

        while (queue.length > 0) {
            const item = queue.shift();
            if (!item) continue;
            const { streamId, currentPayload, viaEdge } = item;

            const visitCount = streamVisits.get(streamId) || 0;
            if (visitCount >= maxLoops) {
                const stream = streams.find(t => t.id === streamId);
                const streamName = stream ? stream.name : streamId;

                if (viaEdge) {
                    steps.push({ type: 'warning', message: '', isCycle: true, id: viaEdge });
                }
                steps.push({ type: 'warning', message: `⚠️ Cycle limit reached at stream: ${streamName}`, id: streamId });
                log.push({
                    time: ts(),
                    type: 'warning',
                    message: `⚠️ Cycle limit reached at stream: ${streamName}`,
                });
                continue;
            }
            streamVisits.set(streamId, visitCount + 1);

            const stream = streams.find(t => t.id === streamId);
            if (!stream) continue;

            const evFlag = payloads.length > 1 ? ` [Event ${i + 1}/${payloads.length}]` : '';

            steps.push({ type: 'stream', id: streamId, message: `📨 Event arrives at stream: ${stream.name} (${stream.type.toUpperCase()})${evFlag}`, payload: currentPayload });
            log.push({
                time: ts(),
                type: 'stream',
                id: streamId,
                message: `📨 Event arrives at stream: ${stream.name}${evFlag}`,
                payload: currentPayload,
            });

            const consumerList = consumers.filter(j => (j.sources || []).some(s => s.streamId === streamId));
            for (const consumer of consumerList) {
                const cVisitCount = consumerVisits.get(consumer.id) || 0;
                if (cVisitCount >= maxLoops) continue;
                consumerVisits.set(consumer.id, cVisitCount + 1);

                const outputPayload = currentPayload
                    ? { ...currentPayload, _processedBy: consumer.name, _processedAt: ts() }
                    : null;

                steps.push({ type: 'edge', from: streamId, to: consumer.id, message: '' });
                steps.push({ type: 'consumer', id: consumer.id, message: `⚡ Consumer processes: ${consumer.name}${evFlag}`, payload: currentPayload, outputPayload });

                log.push({
                    time: ts(),
                    type: 'consumer',
                    id: consumer.id,
                    message: `⚡ Consumer processes event: ${consumer.name}${evFlag}`,
                    payload: currentPayload,
                    outputPayload,
                });

                for (const sink of (consumer.sinks || [])) {
                    const sinkId = sink.streamId;
                    steps.push({ type: 'edge', from: consumer.id, to: sinkId, message: '' });
                    const sinkStream = streams.find(t => t.id === sinkId);
                    if (sinkStream) {
                        log.push({
                            time: ts(),
                            type: 'stream',
                            id: sinkId,
                            message: `📤 Event written to stream: ${sinkStream.name}${evFlag}`,
                            payload: outputPayload,
                        });
                    }
                    queue.push({ streamId: sinkId, currentPayload: outputPayload, viaEdge: `${consumer.id}->${sinkId}` });
                }
            }
        }
    }

    return { steps, log };
}

export function buildSimulationActions(
    get: () => StoreState,
    set: (partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>)) => void
) {
    const getSim = () => get().simulation;

    const startSimulation = (startStreamId: string, payloadOrPayloads: any | any[] = null) => {
        const { streams, consumers, simulation } = get();
        const payloads = Array.isArray(payloadOrPayloads) ? payloadOrPayloads : [payloadOrPayloads];
        const { steps, log } = buildSimSteps(startStreamId, streams, consumers, payloads, simulation.maxLoops || 1);

        if (steps.length === 0) {
            get().showToast('No connected consumers found for this stream');
            return;
        }

        _steps = steps;
        _total = steps.length;

        set({
            rightSidebarOpen: true,
            simulation: {
                ...INITIAL_SIM,
                active: true,
                currentStreamId: startStreamId,
                speed: getSim().speed,
                totalSteps: _total,
                currentStep: 0,
                eventLog: [], // Start fresh
            },
        });
    };

    const advanceSimulation = () => {
        const sim = getSim();
        if (!sim.active || sim.currentStep >= _total) {
            set(s => ({ simulation: { ...s.simulation, active: false } }));
            return false;
        }

        const step = _steps[sim.currentStep];
        const updates: Partial<SimulationState> = { currentStep: sim.currentStep + 1 };

        if (step.type === 'stream' && step.id) {
            updates.currentEdgeId = null;
            updates.currentStreamId = step.id;
            updates.visitedStreamIds = [...sim.visitedStreamIds, step.id];
            updates.eventLog = [
                ...sim.eventLog,
                {
                    time: new Date().toISOString(),
                    type: 'stream',
                    message: step.message,
                    payload: step.payload ?? null,
                },
            ];
        } else if (step.type === 'consumer' && step.id) {
            updates.currentEdgeId = null;
            updates.visitedConsumerIds = [...sim.visitedConsumerIds, step.id];
            updates.eventLog = [
                ...sim.eventLog,
                {
                    time: new Date().toISOString(),
                    type: 'consumer',
                    message: step.message,
                    payload: step.payload ?? null,
                    outputPayload: step.outputPayload ?? null,
                },
            ];
        } else if (step.type === 'edge' && step.from && step.to) {
            const edgeId = `${step.from}->${step.to}`;
            updates.currentEdgeId = edgeId;
            updates.activeEdgeIds = [...sim.activeEdgeIds, edgeId];
        } else if (step.type === 'warning') {
            if (step.isCycle && step.id) {
                updates.cycleEdges = [...sim.cycleEdges, step.id];
            } else {
                updates.eventLog = [
                    ...sim.eventLog,
                    {
                        time: new Date().toISOString(),
                        type: 'warning',
                        message: step.message,
                    },
                ];
            }
        }

        set(s => ({ simulation: { ...s.simulation, ...updates } }));
        return sim.currentStep + 1 < _total;
    };

    const stopSimulation = () => {
        const sim = getSim();
        _steps = [];
        _total = 0;
        set({
            simulation: {
                ...INITIAL_SIM,
                speed: sim.speed,
                eventLog: sim.eventLog,
            },
        });
    };

    const clearSimulation = () => {
        _steps = [];
        _total = 0;
        const speed = getSim().speed;
        set({ simulation: { ...INITIAL_SIM, speed } });
    };

    const setSimulationSpeed = (speed: number) =>
        set(s => ({ simulation: { ...s.simulation, speed } }));

    const setMaxLoops = (loops: number) =>
        set(s => ({ simulation: { ...s.simulation, maxLoops: loops } }));

    return {
        startSimulation,
        advanceSimulation,
        stopSimulation,
        clearSimulation,
        setSimulationSpeed,
        setMaxLoops,
    };
}

export { INITIAL_SIM };

