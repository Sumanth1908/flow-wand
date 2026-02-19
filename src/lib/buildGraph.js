/**
 * lib/buildGraph.js
 * ─────────────────────────────────────────────────────────────
 * Pure function: given topics, flinkJobs, activeFlowId and
 * simulation state → returns { nodes, edges } for React Flow.
 */
import { MarkerType } from '@xyflow/react';

const NODE_SPACING_Y = 160;
const COL_GAP = 400;
const ORIGIN_X = 60;
const ORIGIN_Y = 80;

/** @param {{ id: string }[]} topics @param {{ id: string, sourceTopics: string[], sinkTopics: string[] }[]} visibleJobs */
function classifyTopics(topics, visibleJobs) {
    const sourceOnly = [], sinkOnly = [], middle = [], isolated = [];
    topics.forEach(topic => {
        const isSource = visibleJobs.some(j => j.sourceTopics.includes(topic.id));
        const isSink = visibleJobs.some(j => j.sinkTopics.includes(topic.id));
        if (isSource && isSink) middle.push(topic);
        else if (isSource) sourceOnly.push(topic);
        else if (isSink) sinkOnly.push(topic);
        else isolated.push(topic);
    });
    return { sourceOnly, sinkOnly, middle, isolated };
}

function topicSimState(topicId, sim) {
    if (sim?.currentTopicId === topicId && sim.active) return 'active';
    if (sim?.visitedTopicIds?.includes(topicId)) return 'visited';
    return 'idle';
}

function jobSimState(jobId, sim) {
    if (sim?.visitedJobIds?.includes(jobId)) return 'visited';
    return 'idle';
}

export function buildGraph({ topics, flinkJobs, flows, events = [], activeFlowId, simulation }) {
    const nodes = [];
    const edges = [];

    // Filter to active flow
    let visibleJobs = flinkJobs;
    let activeFlowColor = null;
    if (activeFlowId) {
        const flow = flows.find(f => f.id === activeFlowId);
        if (flow) {
            visibleJobs = flinkJobs.filter(j => flow.jobIds.includes(j.id));
            activeFlowColor = flow.color;
        }
    }

    // Collect visible topic IDs
    const visibleTopicIds = new Set();
    visibleJobs.forEach(job => {
        job.sourceTopics.forEach(id => visibleTopicIds.add(id));
        job.sinkTopics.forEach(id => visibleTopicIds.add(id));
    });
    if (!activeFlowId) topics.forEach(t => visibleTopicIds.add(t.id));

    const visibleTopics = topics.filter(t => visibleTopicIds.has(t.id));
    const { sourceOnly, sinkOnly, middle, isolated } = classifyTopics(visibleTopics, visibleJobs);

    // Layout helpers
    const makeTopicNode = (topic, col, row) => ({
        id: topic.id,
        type: 'topic',
        position: { x: ORIGIN_X + col * COL_GAP, y: ORIGIN_Y + row * NODE_SPACING_Y },
        data: {
            label: topic.name,
            partitions: topic.partitions,
            description: topic.description,
            simulationState: topicSimState(topic.id, simulation),
            activeFlowColor,
            eventNames: (topic.eventIds || []).map(eid => {
                const ev = events.find(e => e.id === eid);
                return ev ? ev.name : null;
            }).filter(Boolean),
        },
    });

    const makeJobNode = (job, row) => ({
        id: job.id,
        type: 'flinkJob',
        position: { x: ORIGIN_X + COL_GAP, y: ORIGIN_Y + row * NODE_SPACING_Y },
        data: {
            label: job.name,
            description: job.description,
            sourceCount: job.sourceTopics.length,
            sinkCount: job.sinkTopics.length,
            simulationState: jobSimState(job.id, simulation),
            activeFlowColor,
        },
    });

    // Positions
    sourceOnly.forEach((t, i) => nodes.push(makeTopicNode(t, 0, i)));
    middle.forEach((t, i) => nodes.push(makeTopicNode(t, 0, sourceOnly.length + i)));
    visibleJobs.forEach((j, i) => nodes.push(makeJobNode(j, i)));
    sinkOnly.forEach((t, i) => nodes.push(makeTopicNode(t, 2, i)));
    isolated.forEach((t, i) => nodes.push(makeTopicNode(t, 0, sourceOnly.length + middle.length + i)));

    // Build edges
    visibleJobs.forEach(job => {
        job.sourceTopics.forEach(topicId => {
            if (!visibleTopicIds.has(topicId)) return;
            const edgeId = `${topicId}->${job.id}`;
            const isSimActive = simulation?.activeEdgeIds?.includes(edgeId);
            const edgeColor = isSimActive ? '#6366f1' : (activeFlowColor || 'rgba(148, 163, 184, 0.4)');

            edges.push({
                id: edgeId, source: topicId, target: job.id, type: 'animated',
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor
                },
                data: {
                    label: 'source',
                    simulationState: isSimActive ? 'active' : 'idle',
                    speed: (simulation?.speed || 1000) / 1000,
                    activeFlowColor,
                },
            });
        });
        job.sinkTopics.forEach(topicId => {
            if (!visibleTopicIds.has(topicId)) return;
            const edgeId = `${job.id}->${topicId}`;
            const isSimActive = simulation?.activeEdgeIds?.includes(edgeId);
            const edgeColor = isSimActive ? '#6366f1' : (activeFlowColor || 'rgba(148, 163, 184, 0.4)');

            edges.push({
                id: edgeId, source: job.id, target: topicId, type: 'animated',
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor
                },
                data: {
                    label: 'sink',
                    simulationState: isSimActive ? 'active' : 'idle',
                    speed: (simulation?.speed || 1000) / 1000,
                    activeFlowColor,
                },
            });
        });
    });

    return { nodes, edges };
}
