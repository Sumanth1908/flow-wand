/**
 * hooks/useSimulation.ts
 */
import { SimulationStep, SimulationState, Topic, FlinkJob, StoreState } from '../types';

let _steps: SimulationStep[] = [];
let _total = 0;

const INITIAL_SIM: SimulationState = {
    active: false,
    currentTopicId: null,
    visitedTopicIds: [],
    visitedJobIds: [],
    activeEdgeIds: [],
    eventLog: [],
    speed: 1000,
    totalSteps: 0,
    currentStep: 0,
    steps: [],
};

function buildSimSteps(startTopicId: string, topics: Topic[], flinkJobs: FlinkJob[], payload: any = null) {
    const steps: SimulationStep[] = [];
    const log: any[] = [];
    const queue = [{ topicId: startTopicId, currentPayload: payload }];
    const seenTopics = new Set<string>();
    const visitedJobs = new Set<string>();

    const ts = () => new Date().toISOString();

    while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        const { topicId, currentPayload } = item;

        if (seenTopics.has(topicId)) continue;
        seenTopics.add(topicId);

        const topic = topics.find(t => t.id === topicId);
        if (!topic) continue;

        steps.push({ type: 'topic', id: topicId, message: `📨 Event arrives at topic: ${topic.name}`, payload: currentPayload });
        log.push({
            time: ts(),
            type: 'topic',
            id: topicId,
            message: `📨 Event arrives at topic: ${topic.name}`,
            payload: currentPayload,
        });

        const consumers = flinkJobs.filter(j => j.sourceTopics.includes(topicId));
        for (const job of consumers) {
            if (visitedJobs.has(job.id)) continue;
            visitedJobs.add(job.id);

            const outputPayload = currentPayload
                ? { ...currentPayload, _processedBy: job.name, _processedAt: ts() }
                : null;

            steps.push({ type: 'edge', from: topicId, to: job.id, message: '' });
            steps.push({ type: 'job', id: job.id, message: `⚡ Flink job processes: ${job.name}`, payload: currentPayload, outputPayload });

            log.push({
                time: ts(),
                type: 'job',
                id: job.id,
                message: `⚡ Flink job processes event: ${job.name}`,
                payload: currentPayload,
                outputPayload,
            });

            for (const sinkId of job.sinkTopics) {
                steps.push({ type: 'edge', from: job.id, to: sinkId, message: '' });
                const sinkTopic = topics.find(t => t.id === sinkId);
                if (sinkTopic) {
                    log.push({
                        time: ts(),
                        type: 'topic',
                        id: sinkId,
                        message: `📤 Event written to topic: ${sinkTopic.name}`,
                        payload: outputPayload,
                    });
                }
                if (!seenTopics.has(sinkId)) queue.push({ topicId: sinkId, currentPayload: outputPayload });
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

    const startSimulation = (startTopicId: string, payload: any = null) => {
        const { topics, flinkJobs } = get();
        const { steps, log } = buildSimSteps(startTopicId, topics, flinkJobs, payload);

        if (steps.length === 0) {
            get().showToast('No connected jobs found for this topic');
            return;
        }

        _steps = steps;
        _total = steps.length;

        set({
            rightSidebarOpen: true,
            simulation: {
                ...INITIAL_SIM,
                active: true,
                currentTopicId: startTopicId,
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

        if (step.type === 'topic' && step.id) {
            updates.currentTopicId = step.id;
            updates.visitedTopicIds = [...sim.visitedTopicIds, step.id];
            updates.eventLog = [
                ...sim.eventLog,
                {
                    time: new Date().toISOString(),
                    type: 'topic',
                    message: step.message,
                    payload: step.payload ?? null,
                },
            ];
        } else if (step.type === 'job' && step.id) {
            updates.visitedJobIds = [...sim.visitedJobIds, step.id];
            updates.eventLog = [
                ...sim.eventLog,
                {
                    time: new Date().toISOString(),
                    type: 'job',
                    message: step.message,
                    payload: step.payload ?? null,
                    outputPayload: step.outputPayload ?? null,
                },
            ];
        } else if (step.type === 'edge' && step.from && step.to) {
            const edgeId = `${step.from}->${step.to}`;
            updates.activeEdgeIds = [...sim.activeEdgeIds, edgeId];
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

    return {
        startSimulation,
        advanceSimulation,
        stopSimulation,
        clearSimulation,
        setSimulationSpeed,
    };
}

export { INITIAL_SIM };
