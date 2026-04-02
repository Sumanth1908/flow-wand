/**
 * lib/buildGraph.ts
 * ─────────────────────────────────────────────────────────────
 * Pure function: given streams, consumers, activeFlowId and
 * simulation state → returns { nodes, edges } for React Flow.
 * 
 * Layout: Dagre (Sugiyama layered) with tuned spacing for 300×220 cards.
 */
import { MarkerType, Node, Edge, Position } from '@xyflow/react';
import dagre from 'dagre';
import { EventStream, Consumer, DataFlow, EventType, SimulationState } from '../types';

export interface BuildGraphParams {
    streams: EventStream[];
    consumers: Consumer[];
    flows: DataFlow[];
    events?: EventType[];
    activeFlowId: string | null;
    simulation: SimulationState;
    traceMode?: boolean;
    layoutDirection?: string;
    nodePositions?: Record<string, { x: number, y: number }>;
    edgeRoutings?: Record<string, { cx: number, cy: number }>;
}

// ── Dimensions that match the actual rendered card size ──────────
const NODE_W = 300;
const NODE_H = 220;

// ── Gap between parallel nodes (same rank) ────────────────────────
const NODE_SEP = 80;

// ── Gap between ranks (layers) ───────────────────────────────────
const RANK_SEP = 320;

const getLayoutedElements = (
    nodes: Node[],
    edges: Edge[],
    direction = 'LR',
    nodePositions?: Record<string, { x: number, y: number }>
) => {
    const isHorizontal = direction === 'LR';

    if (nodes.length === 0) return { nodes, edges };

    const g = new dagre.graphlib.Graph({ multigraph: false });
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
        rankdir:  direction,
        nodesep:  NODE_SEP,
        ranksep:  RANK_SEP,
        marginx:  40,
        marginy:  40,
        align:    'UL',    // Upper-Left alignment within each rank — reduces gaps
        acyclicer: 'greedy', // Handle feedback edges (cycle) gracefully
        ranker:   'network-simplex', // Best quality rank assignment
    });

    nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
    edges.forEach(e => {
        // Only register each source→target once (Dagre handles multigraph poorly)
        if (!g.hasEdge(e.source, e.target)) {
            g.setEdge(e.source, e.target);
        }
    });

    dagre.layout(g);

    nodes.forEach(n => {
        n.targetPosition = isHorizontal ? Position.Left  : Position.Top;
        n.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        if (nodePositions?.[n.id]) {
            // User has manually placed this node — keep their position
            n.position = nodePositions[n.id];
        } else {
            const p = g.node(n.id);
            n.position = {
                x: p.x - NODE_W / 2,
                y: p.y - NODE_H / 2,
            };
        }
    });

    return { nodes, edges };
};

// ─── Simulation State Helpers ────────────────────────────────────
const streamSimState = (streamId: string, sim: SimulationState) => {
    if (sim?.currentStreamId === streamId && sim.active) return 'active';
    if (sim?.visitedStreamIds?.includes(streamId)) return 'visited';
    return 'idle';
};

const consumerSimState = (consumerId: string, sim: SimulationState) => {
    if (sim?.visitedConsumerIds?.includes(consumerId)) return 'visited';
    return 'idle';
};

// ─── Main Graph Builder ──────────────────────────────────────────
export const buildGraph = ({
    streams, consumers, flows, events = [], activeFlowId,
    simulation, traceMode, layoutDirection = 'LR', nodePositions, edgeRoutings
}: BuildGraphParams): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Filter to active flow
    let visibleConsumers = consumers;
    if (activeFlowId) {
        const flow = flows.find(f => f.id === activeFlowId);
        if (flow) visibleConsumers = consumers.filter(j => flow.consumerIds.includes(j.id));
    }

    // Collect visible stream IDs (excluding DLQ)
    const visibleStreamIds = new Set<string>();
    visibleConsumers.forEach(c => {
        (c.sources || []).forEach(s => visibleStreamIds.add(s.streamId));
        (c.sinks   || []).forEach(s => visibleStreamIds.add(s.streamId));
    });
    if (!activeFlowId) streams.forEach(t => visibleStreamIds.add(t.id));

    const dlqStreamIds  = new Set(streams.filter(s => s.isDLQ).map(s => s.id));
    const visibleStreams = streams.filter(t => visibleStreamIds.has(t.id) && !dlqStreamIds.has(t.id));

    // Stream nodes
    visibleStreams.forEach(t => nodes.push({
        id: t.id, type: 'stream',
        position: { x: 0, y: 0 },
        data: {
            label: t.name, type: t.type,
            partitions: t.partitions, description: t.description,
            simulationState: streamSimState(t.id, simulation),
        },
    }));

    // Consumer nodes
    visibleConsumers.forEach(j => nodes.push({
        id: j.id, type: 'consumer',
        position: { x: 0, y: 0 },
        data: {
            label: j.name, description: j.description, type: j.type,
            sourceCount: (j.sources || []).length,
            sinkCount:   (j.sinks   || []).length,
            simulationState: consumerSimState(j.id, simulation),
            sourceEvents: Array.from(new Set((j.sources || []).flatMap(s => s.eventIds))).map(eid => {
                const ev = events.find(e => e.id === eid); return ev?.name ?? null;
            }).filter(Boolean),
            sinkEvents: Array.from(new Set((j.sinks || []).flatMap(s => s.eventIds))).map(eid => {
                const ev = events.find(e => e.id === eid); return ev?.name ?? null;
            }).filter(Boolean),
            dlqSinkStreamName: j.dlqSink
                ? (streams.find(s => s.id === j.dlqSink!.streamId)?.name ?? undefined)
                : undefined,
        },
    }));

    // Merge duplicate stream connections
    const mergeConnections = (connections: { streamId: string; eventIds: string[] }[]) => {
        const map = new Map<string, string[]>();
        for (const c of connections) {
            const ex = map.get(c.streamId) || [];
            map.set(c.streamId, [...new Set([...ex, ...c.eventIds])]);
        }
        return Array.from(map.entries()).map(([streamId, eventIds]) => ({ streamId, eventIds }));
    };

    // Edges
    visibleConsumers.forEach(consumer => {
        mergeConnections(consumer.sources || []).forEach(source => {
            const streamId = source.streamId;
            if (!visibleStreamIds.has(streamId)) return;
            const edgeId      = `${streamId}->${consumer.id}`;
            const isSimActive = simulation?.activeEdgeIds?.includes(edgeId);
            const isCurrent   = simulation?.currentEdgeId === edgeId;
            let simState = 'idle';
            if (isSimActive) simState = (traceMode && !isCurrent) ? 'visited' : 'active';
            const isCycle   = simulation?.cycleEdges?.includes(edgeId);
            const edgeColor = isCycle ? '#ef4444' : (isSimActive ? '#6366f1' : '#b4c4d4');

            edges.push({
                id: edgeId, source: streamId, target: consumer.id, type: 'animated',
                sourceHandle: 'src-out', targetHandle: 'src-in',
                markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
                data: {
                    label: 'source', edgeTypeColor: '#6366f1',
                    simulationState: isCycle ? 'warning' : simState,
                    speed: (simulation?.speed || 1000) / 1000,
                    eventNames: (source.eventIds || []).map(eid => {
                        const ev = events.find(e => e.id === eid); return ev?.name ?? null;
                    }).filter(Boolean),
                    routing: edgeRoutings?.[edgeId] || null,
                },
            });
        });

        mergeConnections(consumer.sinks || []).forEach(sink => {
            const streamId = sink.streamId;
            if (!visibleStreamIds.has(streamId) || dlqStreamIds.has(streamId)) return;
            const edgeId      = `${consumer.id}->${streamId}`;
            const isSimActive = simulation?.activeEdgeIds?.includes(edgeId);
            const isCurrent   = simulation?.currentEdgeId === edgeId;
            let simState = 'idle';
            if (isSimActive) simState = (traceMode && !isCurrent) ? 'visited' : 'active';
            const isCycle   = simulation?.cycleEdges?.includes(edgeId);
            const edgeColor = isCycle ? '#ef4444' : (isSimActive ? '#6366f1' : '#b4c4d4');

            edges.push({
                id: edgeId, source: consumer.id, target: streamId, type: 'animated',
                sourceHandle: 'snk-out', targetHandle: 'snk-in',
                markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
                data: {
                    label: 'sink', edgeTypeColor: '#f59e0b',
                    simulationState: isCycle ? 'warning' : simState,
                    speed: (simulation?.speed || 1000) / 1000,
                    eventNames: (sink.eventIds || []).map(eid => {
                        const ev = events.find(e => e.id === eid); return ev?.name ?? null;
                    }).filter(Boolean),
                    routing: edgeRoutings?.[edgeId] || null,
                },
            });
        });
    });

    return getLayoutedElements(nodes, edges, layoutDirection, nodePositions);
};
