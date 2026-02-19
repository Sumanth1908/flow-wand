import React, { useCallback, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TopicNode from './nodes/TopicNode';
import FlinkJobNode from './nodes/FlinkJobNode';
import AnimatedEdge from './edges/AnimatedEdge';
import useStore from '../store/useStore';

const nodeTypes = {
    topic: TopicNode,
    flinkJob: FlinkJobNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

const FlowCanvas = () => {
    const { topics, flinkJobs, flows, activeFlowId, simulation, selectedNodeId } =
        useStore();

    // Build nodes and edges from data
    const { initialNodes, initialEdges } = useMemo(() => {
        const nodes = [];
        const edges = [];

        // Determine which jobs to show
        let visibleJobs = flinkJobs;
        let visibleTopicIds = new Set();

        if (activeFlowId) {
            const activeFlow = flows.find((f) => f.id === activeFlowId);
            if (activeFlow) {
                visibleJobs = flinkJobs.filter((j) => activeFlow.jobIds.includes(j.id));
            }
        }

        // Collect all topic IDs connected to visible jobs
        visibleJobs.forEach((job) => {
            job.sourceTopics.forEach((tId) => visibleTopicIds.add(tId));
            job.sinkTopics.forEach((tId) => visibleTopicIds.add(tId));
        });

        // If no active flow, show all topics
        if (!activeFlowId) {
            topics.forEach((t) => visibleTopicIds.add(t.id));
        }

        // Position calculation with auto-layout
        const topicsList = topics.filter((t) => visibleTopicIds.has(t.id));

        // Simple layout: topics on left column, jobs on right column
        // Group by connectivity for better visual layout
        const jobMap = new Map();
        visibleJobs.forEach((j, i) => jobMap.set(j.id, i));

        // Track which topics are sources-only, sinks-only, or both
        const sourceOnlyTopics = [];
        const sinkOnlyTopics = [];
        const middleTopics = [];
        const isolatedTopics = [];

        topicsList.forEach((topic) => {
            const isSource = visibleJobs.some((j) => j.sourceTopics.includes(topic.id));
            const isSink = visibleJobs.some((j) => j.sinkTopics.includes(topic.id));

            if (isSource && isSink) {
                middleTopics.push(topic);
            } else if (isSource) {
                sourceOnlyTopics.push(topic);
            } else if (isSink) {
                sinkOnlyTopics.push(topic);
            } else {
                isolatedTopics.push(topic);
            }
        });

        const nodeSpacingY = 160;
        const columnSpacing = 400;

        // Source topics on the far left
        sourceOnlyTopics.forEach((topic, i) => {
            const simState = simulation.active
                ? simulation.visitedTopicIds?.includes(topic.id)
                    ? simulation.currentTopicId === topic.id
                        ? 'active'
                        : 'visited'
                    : 'idle'
                : 'idle';

            nodes.push({
                id: topic.id,
                type: 'topic',
                position: { x: 50, y: 80 + i * nodeSpacingY },
                data: {
                    label: topic.name,
                    partitions: topic.partitions,
                    description: topic.description,
                    simulationState: simState,
                },
            });
        });

        // Middle/shared topics
        middleTopics.forEach((topic, i) => {
            const simState = simulation.active
                ? simulation.visitedTopicIds?.includes(topic.id)
                    ? simulation.currentTopicId === topic.id
                        ? 'active'
                        : 'visited'
                    : 'idle'
                : 'idle';

            nodes.push({
                id: topic.id,
                type: 'topic',
                position: { x: 50, y: 80 + (sourceOnlyTopics.length + i) * nodeSpacingY },
                data: {
                    label: topic.name,
                    partitions: topic.partitions,
                    description: topic.description,
                    simulationState: simState,
                },
            });
        });

        // Flink Jobs in the middle
        visibleJobs.forEach((job, i) => {
            const simState = simulation.active
                ? simulation.visitedJobIds?.includes(job.id)
                    ? 'visited'
                    : 'idle'
                : 'idle';

            // Check if it's the currently processing job
            const isCurrentlyActive = simulation.active &&
                simulation.eventLog?.some(
                    (e) => e.type === 'job' && e.id === job.id
                ) &&
                !simulation.eventLog?.some(
                    (e, idx) => e.type === 'topic' &&
                        idx > simulation.eventLog.findLastIndex((x) => x.type === 'job' && x.id === job.id)
                );

            nodes.push({
                id: job.id,
                type: 'flinkJob',
                position: { x: 50 + columnSpacing, y: 80 + i * nodeSpacingY },
                data: {
                    label: job.name,
                    description: job.description,
                    sourceCount: job.sourceTopics.length,
                    sinkCount: job.sinkTopics.length,
                    simulationState: isCurrentlyActive ? 'active' : simState,
                },
            });
        });

        // Sink-only topics on the right
        sinkOnlyTopics.forEach((topic, i) => {
            const simState = simulation.active
                ? simulation.visitedTopicIds?.includes(topic.id)
                    ? simulation.currentTopicId === topic.id
                        ? 'active'
                        : 'visited'
                    : 'idle'
                : 'idle';

            nodes.push({
                id: topic.id,
                type: 'topic',
                position: { x: 50 + columnSpacing * 2, y: 80 + i * nodeSpacingY },
                data: {
                    label: topic.name,
                    partitions: topic.partitions,
                    description: topic.description,
                    simulationState: simState,
                },
            });
        });

        // Isolated topics at the bottom left
        isolatedTopics.forEach((topic, i) => {
            nodes.push({
                id: topic.id,
                type: 'topic',
                position: {
                    x: 50,
                    y:
                        80 +
                        (sourceOnlyTopics.length + middleTopics.length + i) * nodeSpacingY,
                },
                data: {
                    label: topic.name,
                    partitions: topic.partitions,
                    description: topic.description,
                    simulationState: 'idle',
                },
            });
        });

        // Create edges: source topics → jobs, jobs → sink topics
        visibleJobs.forEach((job) => {
            job.sourceTopics.forEach((topicId) => {
                if (visibleTopicIds.has(topicId)) {
                    const edgeId = `${topicId}->${job.id}`;
                    const isEdgeActive =
                        simulation.active &&
                        simulation.activeEdgeIds?.includes(edgeId);

                    edges.push({
                        id: edgeId,
                        source: topicId,
                        target: job.id,
                        type: 'animated',
                        data: {
                            label: 'source',
                            simulationState: isEdgeActive ? 'active' : 'idle',
                            speed: simulation.speed / 1000,
                        },
                    });
                }
            });

            job.sinkTopics.forEach((topicId) => {
                if (visibleTopicIds.has(topicId)) {
                    const edgeId = `${job.id}->${topicId}`;
                    const isEdgeActive =
                        simulation.active &&
                        simulation.activeEdgeIds?.includes(edgeId);

                    edges.push({
                        id: edgeId,
                        source: job.id,
                        target: topicId,
                        type: 'animated',
                        data: {
                            label: 'sink',
                            simulationState: isEdgeActive ? 'active' : 'idle',
                            speed: simulation.speed / 1000,
                        },
                    });
                }
            });
        });

        return { initialNodes: nodes, initialEdges: edges };
    }, [topics, flinkJobs, flows, activeFlowId, simulation]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync nodes/edges when data changes
    useEffect(() => {
        // Preserve positions of existing nodes
        setNodes((currentNodes) => {
            const posMap = new Map();
            currentNodes.forEach((n) => posMap.set(n.id, n.position));

            return initialNodes.map((n) => ({
                ...n,
                position: posMap.get(n.id) || n.position,
            }));
        });
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    const activeFlow = activeFlowId
        ? flows.find((f) => f.id === activeFlowId)
        : null;

    return (
        <div className="flow-canvas">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                defaultEdgeOptions={{
                    type: 'animated',
                    animated: false,
                }}
                proOptions={{ hideAttribution: true }}
                className="react-flow-dark"
            >
                {/* Controls: bottom-left, with native lock/interactive toggle */}
                <Controls
                    position="bottom-left"
                    showInteractive={true}
                    className="flow-controls"
                />
                <MiniMap
                    position="bottom-right"
                    className="flow-minimap"
                    nodeColor={(node) => {
                        if (node.type === 'topic') return '#6366f1';
                        if (node.type === 'flinkJob') return '#f59e0b';
                        return '#64748b';
                    }}
                    maskColor="rgba(0, 0, 0, 0.5)"
                    pannable
                    zoomable
                />
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="rgba(148, 163, 184, 0.08)"
                />

                {activeFlow && (
                    <Panel position="top-left" className="flow-badge-panel">
                        <div
                            className="flow-badge"
                            style={{
                                '--flow-color': activeFlow.color || '#10b981',
                                background: `color-mix(in srgb, ${activeFlow.color || '#10b981'} 12%, var(--bg-secondary))`,
                                borderColor: `color-mix(in srgb, ${activeFlow.color || '#10b981'} 35%, transparent)`,
                                color: activeFlow.color || '#10b981',
                            }}
                        >
                            <span
                                className="flow-badge-dot"
                                style={{
                                    background: activeFlow.color || '#10b981',
                                    boxShadow: `0 0 8px ${activeFlow.color || '#10b981'}88`,
                                }}
                            />
                            Viewing: {activeFlow.name}
                        </div>
                    </Panel>
                )}

                {nodes.length === 0 && (
                    <Panel position="top-left" className="empty-canvas-panel">
                        <div className="empty-canvas">
                            <div className="empty-canvas-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                            </div>
                            <h3>Start Building Your Flow</h3>
                            <p>Create Kafka topics and Flink jobs from the sidebar to visualize your data pipeline</p>
                        </div>
                    </Panel>
                )}
            </ReactFlow>
        </div>
    );
};

export default FlowCanvas;
