/**
 * hooks/useSimulation.js
 * ─────────────────────────────────────────────────────────────
 * BFS-based event simulation engine.
 *
 * Why module-level refs instead of Zustand state for `steps`:
 *   Storing the full steps array in Zustand means every call to
 *   advanceSimulation triggers a full re-render tree because the
 *   array reference changes.  Keeping steps in module scope lets
 *   us update only the minimal cursor + visited-sets in state.
 */

// Steps and total live outside Zustand so interval ticks don't
// cause unnecessary re-renders of the entire component tree.
let _steps = [];
let _total = 0;

const INITIAL_SIM = {
    active: false,
    currentTopicId: null,
    visitedTopicIds: [],
    visitedJobIds: [],
    activeEdgeIds: [],
    eventLog: [],
    speed: 1000,
    totalSteps: 0,
    currentStep: 0,
    payload: null,  // original payload fired by user
};

/**
 * Build BFS step list starting from a source topic through
 * connected Flink jobs and their sink topics.
 *
 * @param {string}   startTopicId
 * @param {object[]} topics
 * @param {object[]} flinkJobs
 * @returns {{ steps: object[], log: object[] }}
 */
function buildSimSteps(startTopicId, topics, flinkJobs, payload = null) {
    const steps = [];
    const log = [];
    const queue = [{ topicId: startTopicId, currentPayload: payload }];
    const seenTopics = new Set();
    const visitedJobs = new Set();

    const ts = () => new Date().toISOString();

    while (queue.length > 0) {
        const { topicId, currentPayload } = queue.shift();
        if (seenTopics.has(topicId)) continue;
        seenTopics.add(topicId);

        const topic = topics.find(t => t.id === topicId);
        if (!topic) continue;

        steps.push({ type: 'topic', id: topicId, name: topic.name, payload: currentPayload });
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

            // Simulate a passthrough transform — job outputs same shape with metadata added
            const outputPayload = currentPayload
                ? { ...currentPayload, _processedBy: job.name, _processedAt: ts() }
                : null;

            // Edge: topic → job
            steps.push({ type: 'edge', from: topicId, to: job.id });

            // Job processes
            steps.push({ type: 'job', id: job.id, name: job.name, payload: currentPayload, outputPayload });
            log.push({
                time: ts(),
                type: 'job',
                id: job.id,
                message: `⚡ Flink job processes event: ${job.name}`,
                payload: currentPayload,
                outputPayload,
            });

            // Edges: job → sink topics
            for (const sinkId of job.sinkTopics) {
                steps.push({ type: 'edge', from: job.id, to: sinkId });
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

/**
 * Factory that returns simulation actions to be spread into the Zustand store.
 *
 * @param {function} get  – Zustand get
 * @param {function} set  – Zustand set
 */
export function buildSimulationActions(get, set) {
    const getSim = () => get().simulation;

    const startSimulation = (startTopicId, payload = null) => {
        const { topics, flinkJobs } = get();
        const { steps, log } = buildSimSteps(startTopicId, topics, flinkJobs, payload);

        if (steps.length === 0) {
            get().showToast('No connected jobs found for this topic');
            return;
        }

        _steps = steps;
        _total = steps.length;

        set({
            rightSidebarOpen: true, // Auto-open the drawer
            simulation: {
                ...INITIAL_SIM,
                active: true,
                currentTopicId: startTopicId,
                speed: getSim().speed,
                totalSteps: _total,
                currentStep: 0,
                payload,
                previewLog: log,
            },
        });
    };

    /**
     * Advance one step.  Returns true if more steps remain.
     * Called on each interval tick from SimulationPanel.
     */
    const advanceSimulation = () => {
        const sim = getSim();
        if (!sim.active || sim.currentStep >= _total) {
            set(s => ({ simulation: { ...s.simulation, active: false } }));
            return false;
        }

        const step = _steps[sim.currentStep];
        const updates = { currentStep: sim.currentStep + 1 };

        if (step.type === 'topic') {
            updates.currentTopicId = step.id;
            updates.visitedTopicIds = [...sim.visitedTopicIds, step.id];
            updates.eventLog = [
                ...sim.eventLog,
                {
                    time: new Date().toISOString(), type: 'topic', id: step.id,
                    message: `📨 Event arrives at topic: ${step.name}`,
                    payload: step.payload ?? null,
                },
            ];
        } else if (step.type === 'job') {
            updates.visitedJobIds = [...sim.visitedJobIds, step.id];
            updates.eventLog = [
                ...sim.eventLog,
                {
                    time: new Date().toISOString(), type: 'job', id: step.id,
                    message: `⚡ Flink job processes: ${step.name}`,
                    payload: step.payload ?? null,
                    outputPayload: step.outputPayload ?? null,
                },
            ];
        } else if (step.type === 'edge') {
            const edgeId = `${step.from}->${step.to}`;
            updates.activeEdgeIds = [...sim.activeEdgeIds, edgeId];
        }

        set(s => ({ simulation: { ...s.simulation, ...updates } }));
        return sim.currentStep + 1 < _total;
    };

    /**
     * Stop: freeze the state, keep the event log so SimulationPanel
     * can show the COMPLETE badge.
     */
    const stopSimulation = () => {
        const sim = getSim();
        _steps = [];
        _total = 0;
        set({
            simulation: {
                ...INITIAL_SIM,
                speed: sim.speed,
                eventLog: sim.eventLog,  // keep log — shows COMPLETE state
            },
        });
    };

    /** Clear: wipe everything including log */
    const clearSimulation = () => {
        _steps = [];
        _total = 0;
        const speed = getSim().speed;
        set({ simulation: { ...INITIAL_SIM, speed } });
    };

    const setSimulationSpeed = (speed) =>
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
