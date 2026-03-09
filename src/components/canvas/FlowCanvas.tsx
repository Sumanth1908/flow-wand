/**
 * components/canvas/FlowCanvas.tsx
 */
import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
    ReactFlow, MiniMap, Background,
    BackgroundVariant, useNodesState, useEdgesState, Panel,
    Node, Edge, FitViewOptions, ProOptions, useReactFlow,
} from '@xyflow/react';
import { Square, Settings2, Send, Camera, ZoomIn, ZoomOut, Maximize, Lock, Unlock, RotateCcw } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import StreamNode from '../nodes/StreamNode';
import ConsumerNode from '../nodes/ConsumerNode';
import AnimatedEdge from '../edges/AnimatedEdge';
import useStore from '../../store/useStore';
import { buildGraph } from '../../lib/buildGraph';
import { Box, Paper, IconButton, Button, Typography, Tooltip, Divider, Badge, useTheme } from '@mui/material';

const nodeTypes = { stream: StreamNode, consumer: ConsumerNode };
const edgeTypes = { animated: AnimatedEdge };

const FlowCanvasInner: React.FC = () => {
    const theme = useTheme();
    const { fitView, zoomIn, zoomOut } = useReactFlow();

    const streams = useStore(s => s.streams);
    const consumers = useStore(s => s.consumers);
    const flows = useStore(s => s.flows);
    const events = useStore(s => s.events);
    const activeFlowId = useStore(s => s.activeFlowId);
    const simulation = useStore(s => s.simulation);
    const traceMode = useStore(s => s.traceMode);

    // Global style configs
    const edgeStyle = useStore(s => s.edgeStyle);
    const edgeShape = useStore(s => s.edgeShape);
    const layoutDirection = useStore(s => s.layoutDirection);
    const stopSimulation = useStore(s => s.stopSimulation);
    const clearSimulation = useStore(s => s.clearSimulation);
    const openModal = useStore(s => s.openModal);
    const nodePositions = useStore(s => s.nodePositions);
    const updateNodePositions = useStore(s => s.updateNodePositions);
    const activeProjectId = useStore(s => s.activeProjectId);
    const edgeRoutings = useStore(s => s.edgeRoutings);
    const hoveredEdgeId = useStore(s => s.hoveredEdgeId);

    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => buildGraph({ streams, consumers, flows, events, activeFlowId, simulation, traceMode, layoutDirection, nodePositions, edgeRoutings }),
        // Don't re-run full graph build just because edge routing changes
        [streams, consumers, flows, events, activeFlowId, simulation, traceMode, layoutDirection, nodePositions]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);
    const [isLocked, setIsLocked] = useState(false);

    const prevLayoutRef = useRef(layoutDirection);
    const prevNodePositionsRef = useRef(nodePositions);
    const prevProjIdRef = useRef(activeProjectId);
    const prevNodeCountRef = useRef(0);

    const fitViewOptions: FitViewOptions = { padding: 0.3, maxZoom: 1.5 };
    const proOptions: ProOptions = { hideAttribution: true };
    const canvasRef = useRef<HTMLDivElement>(null);

    // Uplift hovered edge to front by bumping its zIndex
    useEffect(() => {
        setEdges(eds => eds.map(e => ({ ...e, zIndex: e.id === hoveredEdgeId ? 1000 : 0 })));
    }, [hoveredEdgeId, setEdges]);

    // Sync nodes/edges when props change
    useEffect(() => {
        const layoutChanged = prevLayoutRef.current !== layoutDirection;
        const resetTriggered = Object.keys(nodePositions).length === 0 && Object.keys(prevNodePositionsRef.current).length > 0;

        if (layoutChanged || resetTriggered) {
            setNodes(initialNodes as Node[]);
            setTimeout(() => {
                fitView({ ...fitViewOptions, duration: 400 });
            }, 50);
        } else {
            setNodes(current => {
                const posMap = new Map(current.map(n => [n.id, n.position]));
                return (initialNodes as Node[]).map(n => ({
                    ...n,
                    position: posMap.get(n.id) ?? n.position
                }));
            });
        }
        setEdges(initialEdges as Edge[]);

        prevLayoutRef.current = layoutDirection;
        prevNodePositionsRef.current = nodePositions;
    }, [initialNodes, initialEdges, layoutDirection, nodePositions, setNodes, setEdges, fitView]);

    // fitView on project load or major structure change
    useEffect(() => {
        const projChanged = prevProjIdRef.current !== activeProjectId;
        const countChanged = nodes.length !== prevNodeCountRef.current;

        if (nodes.length > 0 && (projChanged || countChanged)) {
            const timer = setTimeout(() => {
                fitView({ ...fitViewOptions, duration: 800 });
            }, 150);
            prevProjIdRef.current = activeProjectId;
            prevNodeCountRef.current = nodes.length;
            return () => clearTimeout(timer);
        }
    }, [nodes.length, activeProjectId, fitView]);

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        if (node.type === 'stream') {
            const stream = streams.find(s => s.id === node.id);
            if (stream) openModal('nodeDetails', { type: 'stream', item: stream });
        } else if (node.type === 'consumer') {
            const consumer = consumers.find(c => c.id === node.id);
            if (consumer) openModal('nodeDetails', { type: 'consumer', item: consumer });
        }
    };

    const onNodeDragStop = (_: React.MouseEvent, node: Node) => {
        updateNodePositions({ [node.id]: node.position });
    };

    const hasActiveSettings = (simulation.speed !== 1000 || traceMode || edgeStyle !== 'solid' || edgeShape !== 'circle');

    const activeFlow = activeFlowId ? flows.find(f => f.id === activeFlowId) : null;

    return (
        <Box sx={{ flex: 1, height: '100%', position: 'relative' }} ref={canvasRef}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes as any}
                edgeTypes={edgeTypes as any}
                fitView
                fitViewOptions={fitViewOptions}
                defaultEdgeOptions={{ type: 'animated' }}
                proOptions={proOptions}
                nodesDraggable={!isLocked}
                nodesConnectable={!isLocked}
                elementsSelectable={!isLocked}
                minZoom={0.1}
                maxZoom={3}
                style={{ background: 'var(--bg-primary)' }}
            >

                <MiniMap
                    position="bottom-right"
                    nodeColor={node => node.type === 'stream' ? '#6366f1' : node.type === 'consumer' ? '#f59e0b' : '#64748b'}
                    maskColor="rgba(0,0,0,0.5)"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px' }}
                    pannable zoomable
                />

                <Panel position="bottom-left" style={{ marginBottom: 16, marginLeft: 16 }}>
                    <Paper elevation={4} sx={{ display: 'flex', flexDirection: 'column', p: 0.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Tooltip title="Zoom In" placement="right">
                            <IconButton size="small" onClick={() => zoomIn()} sx={{ borderRadius: 1.5, mb: 0.5 }}><ZoomIn size={18} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Zoom Out" placement="right">
                            <IconButton size="small" onClick={() => zoomOut()} sx={{ borderRadius: 1.5, mb: 0.5 }}><ZoomOut size={18} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Fit View" placement="right">
                            <IconButton size="small" onClick={() => fitView({ padding: 0.3, duration: 800 })} sx={{ borderRadius: 1.5, mb: 0.5 }}><Maximize size={18} /></IconButton>
                        </Tooltip>
                        <Divider sx={{ my: 0.5 }} />
                        <Tooltip title={isLocked ? "Unlock Canvas" : "Lock Canvas"} placement="right">
                            <IconButton size="small" onClick={() => setIsLocked(!isLocked)} sx={{ borderRadius: 1.5, color: isLocked ? 'warning.main' : 'text.secondary' }}>
                                {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Panel>

                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />

                {activeFlow && (
                    <Panel position="top-left">
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            px: 2, py: 1, borderRadius: 2, border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.secondary', opacity: 0.5 }} />
                            <Typography variant="body2" fontWeight="bold">Viewing: {activeFlow.name}</Typography>
                        </Box>
                    </Panel>
                )}

                <Panel position="bottom-center" style={{ marginBottom: 16, zIndex: 1000 }}>
                    <Paper elevation={4} sx={{ display: 'flex', alignItems: 'center', p: 0.5, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>

                        <Button
                            startIcon={<Send size={16} />}
                            onClick={() => openModal('fireEvent')}
                            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 'bold', px: 2, borderRadius: 2 }}
                        >
                            Fire Event
                        </Button>

                        {simulation.active && (
                            <Button
                                startIcon={<Square size={14} fill="currentColor" />}
                                onClick={stopSimulation}
                                sx={{ color: 'error.main', textTransform: 'none', fontWeight: 'bold', px: 2, borderRadius: 2 }}
                            >
                                Stop
                            </Button>
                        )}

                        {simulation.eventLog?.length > 0 && (
                            <Button
                                startIcon={<RotateCcw size={16} />}
                                onClick={clearSimulation}
                                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' }, textTransform: 'none', fontWeight: 'bold', px: 2, borderRadius: 2 }}
                            >
                                Reset
                            </Button>
                        )}

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />

                        <Tooltip title="Export canvas as PNG">
                            <IconButton onClick={() => openModal('snapshot')} sx={{ color: 'text.secondary', borderRadius: 2 }}>
                                <Camera size={18} />
                            </IconButton>
                        </Tooltip>

                        <Button
                            startIcon={
                                <Badge color="secondary" variant="dot" invisible={!hasActiveSettings}>
                                    <Settings2 size={16} />
                                </Badge>
                            }
                            onClick={() => openModal('settings')}
                            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 'bold', px: 2, borderRadius: 2 }}
                        >
                            Settings
                        </Button>
                    </Paper>
                </Panel>

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
