/**
 * components/canvas/FlowCanvas.tsx
 */
import React, { useMemo, useEffect, useState } from 'react';
import {
    ReactFlow, Controls, MiniMap, Background,
    BackgroundVariant, useNodesState, useEdgesState, Panel,
    Node, Edge, FitViewOptions, ProOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TopicNode from '../nodes/TopicNode';
import FlinkJobNode from '../nodes/FlinkJobNode';
import AnimatedEdge from '../edges/AnimatedEdge';
import useStore from '../../store/useStore';
import { buildGraph } from '../../lib/buildGraph';

const nodeTypes = { topic: TopicNode, flinkJob: FlinkJobNode };
const edgeTypes = { animated: AnimatedEdge };

const FlowCanvas: React.FC = () => {
    const topics = useStore(s => s.topics);
    const flinkJobs = useStore(s => s.flinkJobs);
    const flows = useStore(s => s.flows);
    const events = useStore(s => s.events);
    const activeFlowId = useStore(s => s.activeFlowId);
    const simulation = useStore(s => s.simulation);

    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => buildGraph({ topics, flinkJobs, flows, events, activeFlowId, simulation }),
        [topics, flinkJobs, flows, events, activeFlowId, simulation]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        setNodes(current => {
            const posMap = new Map(current.map(n => [n.id, n.position]));
            return (initialNodes as Node[]).map(n => ({ ...n, position: posMap.get(n.id) ?? n.position }));
        });
        setEdges(initialEdges as Edge[]);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    const activeFlow = activeFlowId ? flows.find(f => f.id === activeFlowId) : null;

    const fitViewOptions: FitViewOptions = { padding: 0.3 };
    const proOptions: ProOptions = { hideAttribution: true };

    return (
        <div className="flow-canvas">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes as any}
                edgeTypes={edgeTypes as any}
                fitView
                fitViewOptions={fitViewOptions}
                defaultEdgeOptions={{ type: 'animated' }}
                proOptions={proOptions}
                nodesDraggable={!isLocked}
                nodesConnectable={!isLocked}
                elementsSelectable={!isLocked}
                className="react-flow-dark"
            >
                <Controls
                    position="bottom-left"
                    showInteractive
                    onInteractiveChange={(val) => setIsLocked(!val)}
                    className="flow-controls"
                />

                <MiniMap
                    position="bottom-right"
                    className="flow-minimap"
                    nodeColor={node => node.type === 'topic' ? '#6366f1' : node.type === 'flinkJob' ? '#f59e0b' : '#64748b'}
                    maskColor="rgba(0,0,0,0.5)"
                    pannable zoomable
                />

                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(148,163,184,0.08)" />

                {activeFlow && (
                    <Panel position="top-left" className="flow-badge-panel">
                        <div
                            className="flow-badge"
                            style={{
                                background: `color-mix(in srgb, ${activeFlow.color || '#10b981'} 12%, var(--bg-secondary))`,
                                borderColor: `color-mix(in srgb, ${activeFlow.color || '#10b981'} 35%, transparent)`,
                                color: activeFlow.color || '#10b981',
                            } as React.CSSProperties}
                        >
                            <span
                                className="flow-badge-dot"
                                style={{ background: activeFlow.color || '#10b981', boxShadow: `0 0 8px ${activeFlow.color || '#10b981'}88` } as React.CSSProperties}
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
