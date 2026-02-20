/**
 * components/canvas/FlowCanvas.tsx
 */
import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
    ReactFlow, Controls, MiniMap, Background,
    BackgroundVariant, useNodesState, useEdgesState, Panel,
    Node, Edge, FitViewOptions, ProOptions, useReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import { Gauge, Footprints, Play, Square, Settings2, Send, Trash2, Camera } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import StreamNode from '../nodes/StreamNode';
import ConsumerNode from '../nodes/ConsumerNode';
import AnimatedEdge from '../edges/AnimatedEdge';
import EventDispatcher from '../simulation/EventDispatcher';
import SnapshotPanel from './SnapshotPanel';
import useStore from '../../store/useStore';
import { buildGraph } from '../../lib/buildGraph';
import { toPng } from 'html-to-image';

const nodeTypes = { stream: StreamNode, consumer: ConsumerNode };
const edgeTypes = { animated: AnimatedEdge };

const FlowCanvasInner: React.FC = () => {
    const streams = useStore(s => s.streams);
    const consumers = useStore(s => s.consumers);
    const flows = useStore(s => s.flows);
    const events = useStore(s => s.events);
    const activeFlowId = useStore(s => s.activeFlowId);
    const simulation = useStore(s => s.simulation);
    const traceMode = useStore(s => s.traceMode);

    // Global style configs
    const edgeStyle = useStore(s => s.edgeStyle);
    const setEdgeStyle = useStore(s => s.setEdgeStyle);
    const edgeShape = useStore(s => s.edgeShape);
    const setEdgeShape = useStore(s => s.setEdgeShape);
    const setSimulationSpeed = useStore(s => s.setSimulationSpeed);
    const setTraceMode = useStore(s => s.setTraceMode);
    const stopSimulation = useStore(s => s.stopSimulation);
    const clearSimulation = useStore(s => s.clearSimulation);
    const openModal = useStore(s => s.openModal);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFireEventOpen, setIsFireEventOpen] = useState(false);
    const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => buildGraph({ streams, consumers, flows, events, activeFlowId, simulation, traceMode }),
        [streams, consumers, flows, events, activeFlowId, simulation, traceMode]
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

    const fitViewOptions: FitViewOptions = { padding: 0.3, maxZoom: 1.5 };
    const proOptions: ProOptions = { hideAttribution: true };
    const { fitView } = useReactFlow();
    const canvasRef = useRef<HTMLDivElement>(null);

    // Fit view whenever nodes change (new project loaded, dagre re-layout)
    const prevNodeCountRef = useRef(0);
    useEffect(() => {
        if (nodes.length > 0 && nodes.length !== prevNodeCountRef.current) {
            // Small delay so dagre layout positions are applied first
            const timer = setTimeout(() => fitView(fitViewOptions), 50);
            prevNodeCountRef.current = nodes.length;
            return () => clearTimeout(timer);
        }
    }, [nodes.length, fitView]);

    const onNodeClick = (event: React.MouseEvent, node: Node) => {
        if (node.type === 'stream') {
            const stream = streams.find(s => s.id === node.id);
            if (stream) openModal('nodeDetails', { type: 'stream', item: stream });
        } else if (node.type === 'consumer') {
            const consumer = consumers.find(c => c.id === node.id);
            if (consumer) openModal('nodeDetails', { type: 'consumer', item: consumer });
        }
    };

    return (
        <div className="flow-canvas" ref={canvasRef}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
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
                    nodeColor={node => node.type === 'stream' ? '#6366f1' : node.type === 'consumer' ? '#f59e0b' : '#64748b'}
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

                <Panel position="bottom-center" className="canvas-settings-panel" style={{ marginBottom: '16px', zIndex: 1000 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>

                        {/* Expandable Settings Menu */}
                        {isMenuOpen && (
                            <div className="hud-settings-popup">
                                {/* Display Settings */}
                                <div className="hud-settings-col display-settings-col">
                                    <span className="hud-settings-title">Appearance</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', width: '60px' }}>Line Style</span>
                                        <select
                                            value={edgeStyle}
                                            onChange={e => setEdgeStyle(e.target.value as any)}
                                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: '6px', fontSize: '11px', padding: '4px 8px', outline: 'none', cursor: 'pointer', flex: 1 }}
                                        >
                                            <option value="solid">Solid</option>
                                            <option value="dashed">Dashed</option>
                                            <option value="dotted">Dotted</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', width: '60px' }}>Animation</span>
                                        <select
                                            value={edgeShape}
                                            onChange={e => setEdgeShape(e.target.value as any)}
                                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: '6px', fontSize: '11px', padding: '4px 8px', outline: 'none', cursor: 'pointer', flex: 1 }}
                                        >
                                            <option value="circle">Circle</option>
                                            <option value="square">Square</option>
                                            <option value="diamond">Diamond</option>
                                            <option value="star">Star</option>
                                            <option value="pizza">🍕 Pizza</option>
                                            <option value="ghost">👻 Ghost</option>
                                            <option value="heart">❤️ Heart</option>
                                            <option value="alien">👽 Alien</option>
                                            <option value="rocket">🚀 Rocket</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Simulation Settings */}
                                <div className="hud-settings-col">
                                    <span className="hud-settings-title">Simulation</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', width: '40px' }}>Speed</span>
                                        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
                                            {[
                                                { label: '0.25×', value: 4000 },
                                                { label: '0.5×', value: 2000 },
                                                { label: '1×', value: 1000 },
                                                { label: '2×', value: 500 },
                                                { label: '4×', value: 250 }
                                            ].map(spd => (
                                                <button
                                                    key={spd.value}
                                                    onClick={() => setSimulationSpeed(spd.value)}
                                                    style={{
                                                        background: simulation.speed === spd.value ? 'var(--indigo)' : 'transparent',
                                                        color: simulation.speed === spd.value ? '#fff' : 'var(--text-secondary)',
                                                        border: 'none', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flex: 1,
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {spd.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
                                        <button
                                            className="hud-trace-btn"
                                            onClick={() => setTraceMode(!traceMode)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%',
                                                background: traceMode ? 'color-mix(in srgb, var(--amber) 20%, transparent)' : 'var(--bg-tertiary)',
                                                color: traceMode ? 'var(--amber)' : 'var(--text-primary)',
                                                border: `1px solid ${traceMode ? 'var(--amber)' : 'var(--border-default)'}`,
                                                borderRadius: '6px', fontSize: '11px', fontWeight: 600, padding: '4px 8px', cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            title={traceMode ? "Trace Mode: On (Shows history path)" : "Trace Mode: Off (Animates all active)"}
                                        >
                                            <Footprints size={12} />
                                            <span>Trace Mode {traceMode ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main HUD Toolbar */}
                        <div className="hud-toolbar">
                            <div style={{ position: 'relative' }}>
                                {/* Event Dispatcher popup */}
                                {isFireEventOpen && (
                                    <div className="hud-popup-container">
                                        <div className="hud-popup-inner">
                                            <EventDispatcher onClose={() => setIsFireEventOpen(false)} />
                                        </div>
                                    </div>
                                )}
                                <button
                                    className={`sidebar-tab hud-btn fire-btn ${isFireEventOpen ? 'active' : ''}`}
                                    onClick={() => { setIsFireEventOpen(!isFireEventOpen); setIsMenuOpen(false); setIsSnapshotOpen(false); }}
                                    style={{ '--tab-color': 'var(--emerald)' } as React.CSSProperties}
                                >
                                    <Send size={15} />
                                    <span className="hud-btn-text">Fire Event</span>
                                </button>
                            </div>

                            {(simulation.active || simulation.visitedStreamIds.length > 0 || simulation.visitedConsumerIds.length > 0) && (
                                <button
                                    className="hud-btn stop-btn"
                                    onClick={() => { stopSimulation(); }}
                                >
                                    <Square size={14} fill="currentColor" />
                                    <span className="hud-btn-text">Stop</span>
                                </button>
                            )}

                            {!simulation.active && simulation.visitedStreamIds.length === 0 && (simulation.eventLog?.length > 0) && (
                                <button
                                    className="hud-btn clear-btn"
                                    onClick={clearSimulation}
                                >
                                    <Trash2 size={14} />
                                    <span className="hud-btn-text">Clear Log</span>
                                </button>
                            )}

                            <div style={{ width: '1px', height: '24px', background: 'var(--border-default)', margin: '0 4px' }} />

                            <div style={{ position: 'relative' }}>
                                {/* Snapshot popup */}
                                {isSnapshotOpen && (
                                    <div className="hud-popup-container">
                                        <div className="hud-popup-inner">
                                            <SnapshotPanel onClose={() => setIsSnapshotOpen(false)} />
                                        </div>
                                    </div>
                                )}
                                <button
                                    className={`sidebar-tab hud-btn snap-btn ${isSnapshotOpen ? 'active' : ''}`}
                                    onClick={() => { setIsSnapshotOpen(!isSnapshotOpen); setIsFireEventOpen(false); setIsMenuOpen(false); }}
                                    style={{ '--tab-color': 'var(--purple)' } as React.CSSProperties}
                                    title="Export canvas as PNG"
                                >
                                    <Camera size={15} />
                                </button>
                            </div>

                            <div style={{ width: '1px', height: '24px', background: 'var(--border-default)', margin: '0 4px' }} />

                            <button
                                className={`hud-btn settings-btn ${isMenuOpen ? 'active' : ''}`}
                                onClick={() => { setIsMenuOpen(!isMenuOpen); setIsFireEventOpen(false); setIsSnapshotOpen(false); }}
                            >
                                <Settings2 size={16} />
                                <span className="hud-btn-text">Settings</span>
                                <div className="settings-dots-wrapper">
                                    {(simulation.speed !== 1000 || traceMode || edgeStyle !== 'solid' || edgeShape !== 'circle') && (
                                        <span className="settings-active-dot" />
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </Panel>

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
                            <p>Create event streams and consumers from the sidebar to visualize your data pipeline</p>
                        </div>
                    </Panel>
                )}
            </ReactFlow>
        </div >
    );
};

// Wrap in ReactFlowProvider so useReactFlow() works
const FlowCanvas: React.FC = () => (
    <ReactFlowProvider>
        <FlowCanvasInner />
    </ReactFlowProvider>
);

export default FlowCanvas;
