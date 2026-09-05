import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { Node, Edge, FitViewOptions, ProOptions, useReactFlow, useNodesState, useEdgesState } from '@xyflow/react';
import { useTheme } from '@mui/material';
import useStore from '../../store/useStore';
import { buildGraph, applySimulationToGraph } from '../../lib/buildGraph';

export function useCanvasGraph() {
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
    const hoveredEdgeId        = useStore(s => s.hoveredEdgeId);
    const focusedConsumerId    = useStore(s => s.focusedConsumerId);
    const setFocusedConsumer   = useStore(s => s.setFocusedConsumer);
    const canvasSearchQuery    = useStore(s => s.canvasSearchQuery);
    const setCanvasSearchQuery = useStore(s => s.setCanvasSearchQuery);

    const topology = useMemo(
        () => buildGraph({ streams, consumers, flows, events, activeFlowId, layoutDirection }),
        [streams, consumers, flows, events, activeFlowId, layoutDirection]
    );
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        const graph = applySimulationToGraph(topology, simulation, traceMode);
        return { ...graph, nodes: graph.nodes.map(node => ({ ...node, position: nodePositions[node.id] ?? node.position })) };
    }, [topology, simulation, traceMode, nodePositions]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);
    const [isLocked, setIsLocked]          = useState(false);
    const [searchOpen, setSearchOpen]      = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const fitViewOptions: FitViewOptions = useMemo(() => ({ padding: 0.3, maxZoom: 1.5 }), []);
    const proOptions: ProOptions         = { hideAttribution: true };
    const canvasRef = useRef<HTMLDivElement>(null);

    const prevSyncProjectRef = useRef(activeProjectId);
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
                data: { ...n.data, isFocusPrimary: false, isFocusNeighbour: false, searchHighlight: false },
            })),
            edges: eds,
        };
    }, [focusNeighbourhood, searchMatches, focusedConsumerId, theme]);

    // ── Sync nodes/edges from store ───────────────────────────────
    useEffect(() => {
        const layoutChanged = prevLayoutRef.current !== layoutDirection || prevSyncProjectRef.current !== activeProjectId;
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
                    position: nodePositions[n.id] ?? posMap.get(n.id) ?? n.position,
                }));
                const traced = applyTraceToNodes(merged);
                const { nodes: overlayNodes } = applyFocusAndSearch(traced, traceEdges);
                return overlayNodes;
            });
            const { edges: overlayEdges } = applyFocusAndSearch(initialNodes as Node[], traceEdges);
            setEdges(overlayEdges);
        }

        prevSyncProjectRef.current = activeProjectId;
        prevLayoutRef.current        = layoutDirection;
        prevNodePositionsRef.current = nodePositions;
    }, [activeProjectId, initialNodes, initialEdges, layoutDirection, nodePositions, setNodes, setEdges, fitView, fitViewOptions, applyTraceToNodes, applyTraceToEdges, applyFocusAndSearch]);

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
    }, [nodes.length, activeProjectId, fitView, fitViewOptions]);

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
        const saved = useStore.getState().nodePositions[node.id];
        if (!saved || saved.x !== node.position.x || saved.y !== node.position.y) {
            setNodes(current => current.map(n => n.id === node.id ? { ...n, position: saved ?? topology.nodes.find(t => t.id === n.id)!.position } : n));
        }
    };

    const hasActiveSettings = simulation.speed !== 1000 || traceMode || edgeStyle !== 'solid' || edgeShape !== 'circle';
    const activeFlow        = activeFlowId ? flows.find(f => f.id === activeFlowId) : null;
    const isFocusActive     = !!focusedConsumerId;
    const isSearchActive    = !!canvasSearchQuery.trim();
    const searchMatchCount  = searchMatches?.size ?? 0;

    return { theme, fitView, zoomIn, zoomOut, nodes, edges, onNodesChange, onEdgesChange, onNodeClick, onNodeDragStop, setFocusedConsumer, fitViewOptions, proOptions, isLocked, setIsLocked, canvasRef, activeFlow, isFocusActive, consumers, focusedConsumerId, searchOpen, searchInputRef, isSearchActive, canvasSearchQuery, setCanvasSearchQuery, searchMatchCount, setSearchOpen, simulation, stopSimulation, clearSimulation, openModal, hasActiveSettings };
}
