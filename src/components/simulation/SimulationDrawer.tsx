import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Gauge,
    Trash2,
    Square,
    BookOpen,
    Zap,
    X,
    Send
} from 'lucide-react';
import useStore from '../../store/useStore';
import SimulationLog from './SimulationLog';
import EventDispatcher from './EventDispatcher';

const SimulationDrawer: React.FC = () => {
    const simulation = useStore(s => s.simulation);
    const advanceSimulation = useStore(s => s.advanceSimulation);
    const stopSimulation = useStore(s => s.stopSimulation);
    const clearSimulation = useStore(s => s.clearSimulation);
    const setSimulationSpeed = useStore(s => s.setSimulationSpeed);
    const rightSidebarOpen = useStore(s => s.rightSidebarOpen);
    const setRightSidebar = useStore(s => s.setRightSidebar);

    const [view, setView] = useState('fire'); // 'fire' or 'log'

    // Automatically switch to log view when simulation starts
    useEffect(() => {
        if (simulation.active) {
            setView('log');
        }
    }, [simulation.active]);

    // Interval logic
    const advanceRef = useRef(advanceSimulation);
    useEffect(() => { advanceRef.current = advanceSimulation; }, [advanceSimulation]);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (simulation.active) {
            intervalRef.current = setInterval(() => {
                const hasMore = advanceRef.current();
                if (!hasMore && intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }, simulation.speed);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [simulation.active, simulation.speed]);

    const hasLog = simulation.eventLog?.length > 0;
    const progress = simulation.totalSteps
        ? Math.round((simulation.currentStep / simulation.totalSteps) * 100)
        : 0;

    return (
        <>
            {/* Persistent Floating Trigger Button (when drawer is closed) */}
            {!rightSidebarOpen && (
                <div className="floating-drawer-trigger">
                    <button
                        className="btn-open-sim"
                        onClick={() => setRightSidebar(true)}
                    >
                        {simulation.active ? (
                            <div className="sim-active-dot" />
                        ) : (
                            <Activity size={16} />
                        )}
                        <span>{simulation.active ? 'Simulation Live' : 'Simulation'}</span>
                    </button>
                </div>
            )}

            {/* Main Floating Drawer */}
            <div className={`simulation-drawer ${!rightSidebarOpen ? 'collapsed' : ''}`}>
                <div className="sim-drawer-content">
                    {/* Header */}
                    <div className="sim-drawer-header">
                        <div className="sim-drawer-title">
                            <Activity size={18} className={`sim-icon ${simulation.active ? 'pulse' : ''}`} />
                            <span>Simulation Center</span>
                            {simulation.active && <span className="sim-status live">LIVE</span>}
                        </div>

                        <button
                            className="sidebar-toggle-btn"
                            onClick={() => setRightSidebar(false)}
                            title="Hide"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* View Switcher Tabs */}
                    <div style={{ display: 'flex', padding: '0 16px', gap: '4px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <button
                            className={`sidebar-tab ${view === 'fire' ? 'active' : ''}`}
                            onClick={() => setView('fire')}
                            style={{ flex: 1, '--tab-color': 'var(--emerald)' } as React.CSSProperties}
                        >
                            <Send size={15} />
                            <span>Fire Event</span>
                        </button>
                        <button
                            className={`sidebar-tab ${view === 'log' ? 'active' : ''}`}
                            onClick={() => setView('log')}
                            style={{ flex: 1, '--tab-color': 'var(--indigo)' } as React.CSSProperties}
                        >
                            <Activity size={15} />
                            <span>Live Log</span>
                        </button>
                    </div>

                    {/* Controls Row */}
                    {(simulation.active || hasLog) && (
                        <div className="sim-drawer-controls-row">
                            <div className="speed-control">
                                <Gauge size={14} />
                                <select
                                    value={simulation.speed}
                                    onChange={e => setSimulationSpeed(Number(e.target.value))}
                                    className="speed-select"
                                    disabled={!simulation.active}
                                >
                                    <option value={2000}>0.5×</option>
                                    <option value={1000}>1×</option>
                                    <option value={500}>2×</option>
                                    <option value={250}>4×</option>
                                </select>
                            </div>

                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                {simulation.active && (
                                    <button className="btn-stop" onClick={stopSimulation}>
                                        <Square size={12} /><span>Stop</span>
                                    </button>
                                )}
                                {!simulation.active && hasLog && (
                                    <button className="btn-clear" onClick={clearSimulation}>
                                        <Trash2 size={12} /><span>Clear</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {simulation.active && (
                        <div className="sim-progress" style={{ padding: '12px 16px 8px' }}>
                            <div className="progress-bar">
                                <motion.div
                                    className="progress-fill"
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <span className="progress-text">{progress}%</span>
                        </div>
                    )}

                    {/* Body Content */}
                    <div className="sim-drawer-log-container">
                        <AnimatePresence mode="wait">
                            {view === 'fire' ? (
                                <motion.div
                                    key="fire"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    style={{ padding: '20px' }}
                                >
                                    <EventDispatcher onClose={() => setView('log')} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="log"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    style={{ height: '100%' }}
                                >
                                    {hasLog ? (
                                        <SimulationLog log={simulation.eventLog} />
                                    ) : (
                                        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                                            <Activity size={32} strokeWidth={1} style={{ opacity: 0.2, marginBottom: '16px' } as React.CSSProperties} />
                                            <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                                                System Idle. Switch to <b>Fire Event</b> to inject data into the mesh.
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer Stats */}
                    {hasLog && (
                        <div className="sim-drawer-footer">
                            <div className="sim-summary" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                                <div className="summary-stat">
                                    <BookOpen size={13} />
                                    <span>{simulation.visitedTopicIds?.length || 0} topics</span>
                                </div>
                                <div className="summary-stat">
                                    <Zap size={13} />
                                    <span>{simulation.visitedJobIds?.length || 0} jobs</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SimulationDrawer;
