/**
 * components/canvas/FlowCanvas.tsx
 */
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';

import {
    ReactFlow, MiniMap, Background,
    BackgroundVariant, useNodesState, useEdgesState, Panel,
    Node, Edge, FitViewOptions, ProOptions, useReactFlow,
} from '@xyflow/react';
import { Square, Settings2, Send, Camera, ZoomIn, ZoomOut, Maximize, Lock, Unlock, RotateCcw, Search, X, Focus } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import StreamNode from '../nodes/StreamNode';
import ConsumerNode from '../nodes/ConsumerNode';
import AnimatedEdge from '../edges/AnimatedEdge';
import useStore from '../../store/useStore';
import { buildGraph } from '../../lib/buildGraph';
import { Box, Paper, IconButton, Button, Typography, Tooltip, Divider, Badge, useTheme, InputBase } from '@mui/material';

const nodeTypes = { stream: StreamNode, consumer: ConsumerNode };
const edgeTypes = { animated: AnimatedEdge };

const FlowCanvasInner: React.FC = () => {
    const theme = useTheme();
    const { fitView, zoomIn, zoomOut } = useReactFlow();

    const streams              = useStore(s => s.streams);
    const consumers            = useStore(s => s.consumers);
    const flows                = useStore(s => s.flows);
    const events               = useStore(s => s.events);
    const activeFlowId         = useStore(s => s.activeFlowId);
    const simulation           = useStore(s => s.simulation);
    const traceMode            = useStore(s => s.traceMode);
    const edgeStyle            = useStore(s => s.edgeStyle);
    const edgeShape            = useStore(s => s.edgeShape);
    const layoutDirection      = useStore(s => s.layoutDirection);
    const stopSimulation       = useStore(s => s.stopSimulation);
    const clearSimulation      = useStore(s => s.clearSimulation);
    const openModal            = useStore(s => s.openModal);
    const nodePositions        = useStore(s => s.nodePositions);
    const updateNodePositions  = useStore(s => s.updateNodePositions);
    const activeProjectId      = useStore(s => s.activeProjectId);
    const edgeRoutings         = useStore(s => s.edgeRoutings);
    const hoveredEdgeId        = useStore(s => s.hoveredEdgeId);
    const focusedConsumerId    = useStore(s => s.focusedConsumerId);
    const setFocusedConsumer   = useStore(s => s.setFocusedConsumer);
    const canvasSearchQuery    = useStore(s => s.canvasSearchQuery);
    const setCanvasSearchQuery = useStore(s => s.setCanvasSearchQuery);

    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => buildGraph({ streams, consumers, flows, events, activeFlowId, simulation, traceMode, layoutDirection, nodePositions, edgeRoutings }),
        [streams, consumers, flows, events, activeFlowId, simulation, traceMode, layoutDirection, nodePositions]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);
    const [isLocked, setIsLocked]          = useState(false);
    const [searchOpen, setSearchOpen]      = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const fitViewOptions: FitViewOptions = { padding: 0.3, maxZoom: 1.5 };
    const proOptions: ProOptions         = { hideAttribution: true };
    const canvasRef = useRef<HTMLDivElement>(null);

    const prevLayoutRef        = useRef(layoutDirection);
    const prevNodePositionsRef = useRef(nodePositions);
    const prevProjIdRef        = useRef(activeProjectId);
    const prevNodeCountRef     = useRef(0);

    // ── Focus neighbourhood computation ──────────────────────────
    const focusNeighbourhood = useMemo(() => {
        if (!focusedConsumerId) return null;
        const consumer = consumers.find(c => c.id === focusedConsumerId);
        if (!consumer) return null;

        const focusedStreamIds = new Set<string>([
            ...(consumer.sources || []).map(s => s.streamId),
            ...(consumer.sinks   || []).map(s => s.streamId),
        ]);

        // Sibling consumers that share any of these streams
        const neighbourConsumerIds = new Set<string>([focusedConsumerId]);
        consumers.forEach(c => {
            if (c.id === focusedConsumerId) return;
            const cStreams = [
                ...(c.sources || []).map(s => s.streamId),
                ...(c.sinks   || []).map(s => s.streamId),
            ];
            if (cStreams.some(sid => focusedStreamIds.has(sid))) neighbourConsumerIds.add(c.id);
        });

        const activeNodeIds = new Set<string>([...focusedStreamIds, ...neighbourConsumerIds]);
        const activeEdgeIds = new Set<string>();
        initialEdges.forEach(e => {
            if (activeNodeIds.has(e.source) && activeNodeIds.has(e.target)) activeEdgeIds.add(e.id);
        });

        return { activeNodeIds, activeEdgeIds };
    }, [focusedConsumerId, consumers, initialEdges]);

    // ── Search match computation ──────────────────────────────────
    const searchMatches = useMemo(() => {
        const q = canvasSearchQuery.trim().toLowerCase();
        if (!q) return null;
        const matchedNodeIds = new Set<string>();
        streams.forEach(s => {
            if (s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)) matchedNodeIds.add(s.id);
        });
        consumers.forEach(c => {
            if (c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)) matchedNodeIds.add(c.id);
        });
        return matchedNodeIds;
    }, [canvasSearchQuery, streams, consumers]);

    // ── Elevate hovered edge ──────────────────────────────────────
    useEffect(() => {
        setEdges(eds => eds.map(e => ({ ...e, zIndex: e.id === hoveredEdgeId ? 1000 : 0 })));
    }, [hoveredEdgeId, setEdges]);

    // ── Trace mode helpers ────────────────────────────────────────
    const applyTraceToNodes = useCallback((nds: Node[]): Node[] => {
        if (!traceMode || !simulation.active) {
            return nds.map(n => ({ ...n, style: { ...n.style, opacity: undefined, filter: undefined } }));
        }
        const visitedStreams   = new Set(simulation.visitedStreamIds   || []);
        const visitedConsumers = new Set(simulation.visitedConsumerIds || []);
        const { currentStreamId, currentConsumerId } = simulation;

        return nds.map(n => {
            const isActive  = n.id === currentStreamId || n.id === currentConsumerId;
            const isVisited = visitedStreams.has(n.id) || visitedConsumers.has(n.id);
            let opacity = 0.35;
            let filter  = '';
            if (isActive) {
                opacity = 1;
                const glowColor = n.type === 'stream' ? 'rgba(99,102,241,0.9)' : 'rgba(245,158,11,0.9)';
                filter = `drop-shadow(0 0 14px ${glowColor}) drop-shadow(0 0 6px ${glowColor})`;
            } else if (isVisited) {
                opacity = 0.90;
            }
            return { ...n, style: { ...n.style, opacity, filter, transition: 'opacity 0.25s ease, filter 0.25s ease' } };
        });
    }, [traceMode, simulation]);

    const applyTraceToEdges = useCallback((eds: Edge[]): Edge[] => {
        if (!traceMode || !simulation.active) {
            return eds.map(e => ({ ...e, hidden: false, style: { ...e.style, opacity: undefined } }));
        }
        const activeEdges = new Set(simulation.activeEdgeIds || []);
        return eds.map(e => {
            if (e.id === simulation.currentEdgeId) return { ...e, hidden: false, style: { ...e.style, opacity: 1,    transition: 'opacity 0.25s ease' } };
            if (activeEdges.has(e.id))             return { ...e, hidden: false, style: { ...e.style, opacity: 0.45, transition: 'opacity 0.25s ease' } };
            return { ...e, hidden: false, style: { ...e.style, opacity: 0.1 } };
        });
    }, [traceMode, simulation]);

    // ── Focus / Search overlay ────────────────────────────────────
    const applyFocusAndSearch = useCallback((nds: Node[], eds: Edge[]): { nodes: Node[], edges: Edge[] } => {
        if (searchMatches) {
            const glow = theme.palette.warning.main;
            return {
                nodes: nds.map(n => ({
                    ...n,
                    style: {
                        ...n.style,
                        opacity: searchMatches.has(n.id) ? 1 : 0.15,
                        filter: searchMatches.has(n.id)
                            ? `drop-shadow(0 0 12px ${glow}) drop-shadow(0 0 4px ${glow})`
                            : 'none',
                        transition: 'opacity 0.2s ease, filter 0.2s ease',
                    },
                    data: { ...n.data, searchHighlight: searchMatches.has(n.id) },
                })),
                edges: eds.map(e => ({
                    ...e,
                    style: {
                        ...e.style,
                        opacity: (searchMatches.has(e.source) || searchMatches.has(e.target)) ? 0.85 : 0.06,
                    },
                })),
            };
        }

        if (focusNeighbourhood) {
            const secondaryGlow = theme.palette.secondary.main;
            const primaryGlow   = theme.palette.primary.main;
            return {
                nodes: nds.map(n => {
                    const inFocus   = focusNeighbourhood.activeNodeIds.has(n.id);
                    const isPrimary = n.id === focusedConsumerId;
                    return {
                        ...n,
                        style: {
                            ...n.style,
                            opacity: inFocus ? 1 : 0.12,
                            filter: isPrimary
                                ? `drop-shadow(0 0 18px ${secondaryGlow}) drop-shadow(0 0 7px ${secondaryGlow})`
                                : inFocus
                                    ? `drop-shadow(0 0 8px ${primaryGlow}66)`
                                    : 'none',
                            transition: 'opacity 0.25s ease, filter 0.25s ease',
                        },
                        data: { ...n.data, isFocusPrimary: isPrimary, isFocusNeighbour: inFocus && !isPrimary },
                    };
                }),
                edges: eds.map(e => ({
                    ...e,
                    style: {
                        ...e.style,
                        opacity: focusNeighbourhood.activeEdgeIds.has(e.id) ? 1 : 0.05,
                        transition: 'opacity 0.25s ease',
                    },
                })),
            };
        }

        // Clear overlays
        return {
            nodes: nds.map(n => ({
                ...n,
                style: { ...n.style, opacity: undefined, filter: undefined },
                data: { ...n.data, isFocusPrimary: false, isFocusNeighbour: false, searchHighlight: false },
            })),
            edges: eds.map(e => ({ ...e, style: { ...e.style, opacity: undefined } })),
        };
    }, [focusNeighbourhood, searchMatches, focusedConsumerId, theme]);

    // ── Sync nodes/edges from store ───────────────────────────────
    useEffect(() => {
        const layoutChanged  = prevLayoutRef.current !== layoutDirection;
        const resetTriggered = Object.keys(nodePositions).length === 0 && Object.keys(prevNodePositionsRef.current).length > 0;

        const traceEdges = applyTraceToEdges(initialEdges as Edge[]);

        if (layoutChanged || resetTriggered) {
            const traceNodes = applyTraceToNodes(initialNodes as Node[]);
            const { nodes: overlayNodes, edges: overlayEdges } = applyFocusAndSearch(traceNodes, traceEdges);
            setNodes(overlayNodes);
            setEdges(overlayEdges);
            setTimeout(() => fitView({ ...fitViewOptions, duration: 400 }), 50);
        } else {
            setNodes(current => {
                const posMap = new Map(current.map(n => [n.id, n.position]));
                const merged = (initialNodes as Node[]).map(n => ({
                    ...n,
                    position: posMap.get(n.id) ?? n.position,
                }));
                const traced = applyTraceToNodes(merged);
                const { nodes: overlayNodes } = applyFocusAndSearch(traced, traceEdges);
                return overlayNodes;
            });
            const { edges: overlayEdges } = applyFocusAndSearch(initialNodes as Node[], traceEdges);
            setEdges(overlayEdges);
        }

        prevLayoutRef.current        = layoutDirection;
        prevNodePositionsRef.current = nodePositions;
    }, [initialNodes, initialEdges, layoutDirection, nodePositions, setNodes, setEdges, fitView, applyTraceToNodes, applyTraceToEdges, applyFocusAndSearch]);

    // fitView on project switch or node count change
    useEffect(() => {
        const projChanged  = prevProjIdRef.current !== activeProjectId;
        const countChanged = nodes.length !== prevNodeCountRef.current;
        if (nodes.length > 0 && (projChanged || countChanged)) {
            const t = setTimeout(() => fitView({ ...fitViewOptions, duration: 800 }), 150);
            prevProjIdRef.current    = activeProjectId;
            prevNodeCountRef.current = nodes.length;
            return () => clearTimeout(t);
        }
    }, [nodes.length, activeProjectId, fitView]);

    // Keyboard shortcut: Cmd/Ctrl+F to open search, Esc to close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
            }
            if (e.key === 'Escape' && searchOpen) {
                setSearchOpen(false);
                setCanvasSearchQuery('');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [searchOpen, setCanvasSearchQuery]);

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

    const hasActiveSettings = simulation.speed !== 1000 || traceMode || edgeStyle !== 'solid' || edgeShape !== 'circle';
    const activeFlow        = activeFlowId ? flows.find(f => f.id === activeFlowId) : null;
    const isFocusActive     = !!focusedConsumerId;
    const isSearchActive    = !!canvasSearchQuery.trim();
    const searchMatchCount  = searchMatches?.size ?? 0;

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

                {/* ── Zoom / Lock controls ─────────────────────── */}
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
                        <Tooltip title={isLocked ? 'Unlock Canvas' : 'Lock Canvas'} placement="right">
                            <IconButton size="small" onClick={() => setIsLocked(!isLocked)} sx={{ borderRadius: 1.5, color: isLocked ? 'warning.main' : 'text.secondary' }}>
                                {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Panel>

                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />

                {/* ── Top-left: Flow / Focus badges ───────────── */}
                <Panel position="top-left">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {activeFlow && (
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 1.5,
                                px: 2, py: 1, borderRadius: 2, border: '1px solid',
                                borderColor: 'divider', bgcolor: 'background.paper',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.secondary', opacity: 0.5 }} />
                                <Typography variant="body2" fontWeight="bold">Viewing: {activeFlow.name}</Typography>
                            </Box>
                        )}

                        {isFocusActive && (
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 1.5,
                                px: 2, py: 1, borderRadius: 2, border: '1px solid',
                                borderColor: 'secondary.main', bgcolor: 'background.paper',
                                backdropFilter: 'blur(8px)',
                                boxShadow: `0 4px 16px ${theme.palette.secondary.main}33`,
                            }}>
                                <Focus size={14} color={theme.palette.secondary.main} />
                                <Typography variant="body2" fontWeight="bold" color="secondary.main">
                                    Focus: {consumers.find(c => c.id === focusedConsumerId)?.name}
                                </Typography>
                                <IconButton size="small" onClick={() => setFocusedConsumer(null)} sx={{ ml: 0.5, p: 0.3, color: 'text.secondary' }}>
                                    <X size={12} />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                </Panel>

                {/* ── Search Bar ───────────────────────────────── */}
                <Panel position="top-center" style={{ marginTop: 12, zIndex: 1000 }}>
                    {searchOpen ? (
                        <Paper
                            elevation={8}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1,
                                px: 2, py: 0.75, borderRadius: 3, minWidth: 340,
                                border: '1px solid',
                                borderColor: isSearchActive ? 'warning.main' : 'divider',
                                bgcolor: 'background.paper',
                                boxShadow: isSearchActive
                                    ? `0 0 0 2px ${theme.palette.warning.main}44, 0 8px 32px rgba(0,0,0,0.2)`
                                    : '0 8px 32px rgba(0,0,0,0.2)',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                            }}
                        >
                            <Search size={15} style={{ color: isSearchActive ? theme.palette.warning.main : theme.palette.text.secondary, flexShrink: 0 }} />
                            <InputBase
                                inputRef={searchInputRef}
                                placeholder="Search nodes… (Esc to close)"
                                value={canvasSearchQuery}
                                onChange={e => setCanvasSearchQuery(e.target.value)}
                                sx={{ flex: 1, fontSize: 13, fontWeight: 500 }}
                                autoFocus
                            />
                            {isSearchActive && (
                                <Typography variant="caption" color="warning.main" fontWeight="bold" sx={{ whiteSpace: 'nowrap', mr: 0.5 }}>
                                    {searchMatchCount} match{searchMatchCount !== 1 ? 'es' : ''}
                                </Typography>
                            )}
                            <IconButton size="small" onClick={() => { setSearchOpen(false); setCanvasSearchQuery(''); }} sx={{ p: 0.3 }}>
                                <X size={14} />
                            </IconButton>
                        </Paper>
                    ) : (
                        <Tooltip title="Search canvas (⌘F / Ctrl+F)">
                            <Paper
                                elevation={2}
                                onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1,
                                    px: 1.5, py: 0.6, borderRadius: 2.5, cursor: 'pointer',
                                    border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                                    '&:hover': { borderColor: 'primary.main', boxShadow: `0 0 0 1px ${theme.palette.primary.main}44` },
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <Search size={14} style={{ color: theme.palette.text.secondary }} />
                                <Typography variant="caption" color="text.secondary" sx={{ userSelect: 'none' }}>Search</Typography>
                                <Box sx={{ px: 0.75, py: 0.2, borderRadius: 1, bgcolor: 'action.hover' }}>
                                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, fontFamily: 'monospace' }}>⌘F</Typography>
                                </Box>
                            </Paper>
                        </Tooltip>
                    )}
                </Panel>

                {/* ── Bottom centre toolbar ────────────────────── */}
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
