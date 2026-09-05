import React from 'react';
import { ReactFlow, MiniMap, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Paper, Typography } from '@mui/material';
import StreamNode from '../nodes/StreamNode';
import ConsumerNode from '../nodes/ConsumerNode';
import AnimatedEdge from '../edges/AnimatedEdge';
import CanvasControls from './CanvasControls';
import { useCanvasGraph } from './useCanvasGraph';

const nodeTypes = { stream: StreamNode, consumer: ConsumerNode };
const edgeTypes = { animated: AnimatedEdge };
const FlowCanvasInner: React.FC = () => {
    const canvas = useCanvasGraph();
    const { nodes, edges, onNodesChange, onEdgesChange, onNodeClick, onNodeDragStop, setFocusedConsumer,
        fitViewOptions, proOptions, isLocked, canvasRef } = canvas;
    return (
        <Box sx={{ flex: 1, height: '100%', position: 'relative' }} ref={canvasRef}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onNodeDragStop={onNodeDragStop}
                onPaneClick={() => setFocusedConsumer(null)}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={fitViewOptions}
                defaultEdgeOptions={{ type: 'animated' }}
                proOptions={proOptions}
                nodesDraggable={!isLocked}
                nodesConnectable={false}
                deleteKeyCode={null}
                elementsSelectable={!isLocked}
                minZoom={0.1}
                maxZoom={3}
                snapToGrid={true}
                snapGrid={[20, 20]}
                style={{ background: 'var(--bg-primary)' }}
            >
                <MiniMap
                    position="bottom-right"
                    nodeColor={node => node.type === 'stream' ? '#6366f1' : node.type === 'consumer' ? '#f59e0b' : '#64748b'}
                    maskColor="rgba(0,0,0,0.5)"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px' }}
                    pannable zoomable
                />

                <CanvasControls {...canvas} />

                {nodes.length === 0 && (
                    <Panel position="top-left">
                        <Paper sx={{ p: 4, ml: 2, mt: 2, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper', maxWidth: 320 }}>
                            <Box sx={{ color: 'text.secondary', mb: 2 }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                            </Box>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>Start Building Your Flow</Typography>
                            <Typography variant="body2" color="text.secondary">Create event streams and consumers from the sidebar to visualize your data pipeline</Typography>
                        </Paper>
                    </Panel>
                )}
            </ReactFlow>
        </Box>
    );
};

export default FlowCanvasInner;
