/**
 * lib/buildGraph.ts
 * ─────────────────────────────────────────────────────────────
 * Pure function: given streams, consumers, activeFlowId and
 * simulation state → returns { nodes, edges } for React Flow.
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

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR', nodePositions?: Record<string, { x: number, y: number }>) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 80, // vertical space between nodes
        ranksep: 200, // horizontal space between nodes
    });

    // Approximate dimensions based on CSS styling of stream and consumer nodes
    const NODE_WIDTH = 260;
    const NODE_HEIGHT = 160;

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const isHorizontal = direction === 'LR';

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // dagre sets the coordinates to the center of the node
        if (nodePositions && nodePositions[node.id]) {
            node.position = nodePositions[node.id];
        } else {
            node.position = {
                x: nodeWithPosition.x - NODE_WIDTH / 2,
                y: nodeWithPosition.y - NODE_HEIGHT / 2,
            };
        }
    });

    return { nodes, edges };
}

const streamSimState = (streamId: string, sim: SimulationState) => {
    if (sim?.currentStreamId === streamId && sim.active) return 'active';
    if (sim?.visitedStreamIds?.includes(streamId)) return 'visited';
    return 'idle';
}

const consumerSimState = (consumerId: string, sim: SimulationState) => {
    if (sim?.visitedConsumerIds?.includes(consumerId)) return 'visited';
    return 'idle';
}

export const buildGraph = ({ streams, consumers, flows, events = [], activeFlowId, simulation, traceMode, layoutDirection = 'LR', nodePositions, edgeRoutings }: BuildGraphParams): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Filter to active flow
    let visibleConsumers = consumers;
    let activeFlowColor: string | undefined = undefined;
    if (activeFlowId) {
        const flow = flows.find(f => f.id === activeFlowId);
        if (flow) {
            visibleConsumers = consumers.filter(j => flow.consumerIds.includes(j.id));
            activeFlowColor = flow.color;
        }
    }

    // Collect visible stream IDs (excluding DLQ streams from the canvas)
    const visibleStreamIds = new Set<string>();
    visibleConsumers.forEach(consumer => {
        (consumer.sources || []).forEach(s => visibleStreamIds.add(s.streamId));
        (consumer.sinks || []).forEach(s => visibleStreamIds.add(s.streamId));
    });
    if (!activeFlowId) streams.forEach(t => visibleStreamIds.add(t.id));

    // Filter out DLQ streams — they are hidden from the canvas entirely
    const dlqStreamIds = new Set(streams.filter(s => s.isDLQ).map(s => s.id));
    const visibleStreams = streams.filter(t => visibleStreamIds.has(t.id) && !dlqStreamIds.has(t.id));

    // Create Stream nodes
    visibleStreams.forEach(t => nodes.push({
        id: t.id,
        type: 'stream',
        position: { x: 0, y: 0 },
        data: {
            label: t.name,
            type: t.type,
            partitions: t.partitions,
            description: t.description,
            simulationState: streamSimState(t.id, simulation),
            activeFlowColor,
        },
    }));

    // Create Consumer nodes
    visibleConsumers.forEach(j => nodes.push({
        id: j.id,
        type: 'consumer',
        position: { x: 0, y: 0 },
        data: {
            label: j.name,
            description: j.description,
            type: j.type,
            sourceCount: (j.sources || []).length,
            sinkCount: (j.sinks || []).length,
            simulationState: consumerSimState(j.id, simulation),
            activeFlowColor,
            sourceEvents: Array.from(new Set((j.sources || []).flatMap(s => s.eventIds))).map(eid => {
                const ev = events.find(e => e.id === eid);
                return ev ? ev.name : null;
            }).filter(Boolean),
            sinkEvents: Array.from(new Set((j.sinks || []).flatMap(s => s.eventIds))).map(eid => {
                const ev = events.find(e => e.id === eid);
                return ev ? ev.name : null;
            }).filter(Boolean),
            dlqSinkStreamName: j.dlqSinkStreamId
                ? (streams.find(s => s.id === j.dlqSinkStreamId)?.name ?? undefined)
                : undefined,
        },
    }));

    // Helper: merge multiple entries for the same streamId into one (prevents duplicate edge IDs)
    const mergeConnections = (connections: { streamId: string; eventIds: string[] }[]) => {
        const map = new Map<string, string[]>();
        for (const c of connections) {
            const existing = map.get(c.streamId) || [];
            map.set(c.streamId, [...new Set([...existing, ...c.eventIds])]);
        }
        return Array.from(map.entries()).map(([streamId, eventIds]) => ({ streamId, eventIds }));
    };

    // Build edges
    visibleConsumers.forEach(consumer => {
        mergeConnections(consumer.sources || []).forEach(source => {
            const streamId = source.streamId;
            if (!visibleStreamIds.has(streamId)) return;
            const edgeId = `${streamId}->${consumer.id}`;
            const isSimActive = simulation?.activeEdgeIds?.includes(edgeId);
            const isCurrent = simulation?.currentEdgeId === edgeId;
            let simState = 'idle';
            if (isSimActive) {
                if (traceMode) {
                    simState = isCurrent ? 'active' : 'visited';
                } else {
                    simState = 'active';
                }
            }
            const isCycle = simulation?.cycleEdges?.includes(edgeId);
            const edgeColor = isCycle ? '#ef4444' : (isSimActive ? '#6366f1' : (activeFlowColor || '#b4c4d4'));

            edges.push({
                id: edgeId, source: streamId, target: consumer.id, type: 'animated',
                sourceHandle: 'src-out',
                targetHandle: 'src-in',
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor
                },
                data: {
                    label: 'source',
                    edgeTypeColor: '#6366f1',
                    simulationState: isCycle ? 'warning' : simState,
                    speed: (simulation?.speed || 1000) / 1000,
                    activeFlowColor,
                    // Specific events for this connection
                    eventNames: (source.eventIds || []).map(eid => {
                        const ev = events.find(e => e.id === eid);
                        return ev ? ev.name : null;
                    }).filter(Boolean),
                    routing: edgeRoutings?.[edgeId] || null,
                },
            });
        });
        mergeConnections(consumer.sinks || []).forEach(sink => {
            const streamId = sink.streamId;
            // Skip DLQ streams — they are not rendered as canvas edges
            if (!visibleStreamIds.has(streamId) || dlqStreamIds.has(streamId)) return;
            const edgeId = `${consumer.id}->${streamId}`;
            const isSimActive = simulation?.activeEdgeIds?.includes(edgeId);
            const isCurrent = simulation?.currentEdgeId === edgeId;
            let simState = 'idle';
            if (isSimActive) {
                if (traceMode) {
                    simState = isCurrent ? 'active' : 'visited';
                } else {
                    simState = 'active';
                }
            }
            const isCycle = simulation?.cycleEdges?.includes(edgeId);
            const edgeColor = isCycle ? '#ef4444' : (isSimActive ? '#6366f1' : (activeFlowColor || '#b4c4d4'));

            edges.push({
                id: edgeId, source: consumer.id, target: streamId, type: 'animated',
                sourceHandle: 'snk-out',
                targetHandle: 'snk-in',
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor
                },
                data: {
                    label: 'sink',
                    edgeTypeColor: '#f59e0b',
                    simulationState: isCycle ? 'warning' : simState,
                    speed: (simulation?.speed || 1000) / 1000,
                    activeFlowColor,
                    // Specific events for this connection
                    eventNames: (sink.eventIds || []).map(eid => {
                        const ev = events.find(e => e.id === eid);
                        return ev ? ev.name : null;
                    }).filter(Boolean),
                    routing: edgeRoutings?.[edgeId] || null,
                },
            });
        });
    });

    return getLayoutedElements(nodes, edges, layoutDirection, nodePositions);
}

