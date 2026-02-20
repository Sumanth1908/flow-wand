import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    ListTree,
    BookOpen,
    Zap,
    X,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import useStore from '../../store/useStore';
import SimulationLog from './SimulationLog';
import { APP_CONFIG } from '../../lib/config';

const SimulationDrawer: React.FC = () => {
    const simulation = useStore(s => s.simulation);
    const advanceSimulation = useStore(s => s.advanceSimulation);
    const rightSidebarOpen = useStore(s => s.rightSidebarOpen);
    const setRightSidebar = useStore(s => s.setRightSidebar);
    const [isTriggerExpanded, setIsTriggerExpanded] = useState(false);

    // Automatically open right sidebar if simulation starts and it was closed
    useEffect(() => {
        if (simulation.active && !rightSidebarOpen) {
            setRightSidebar(true);
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
        <AnimatePresence>
            {/* Persistent Floating Trigger Button (when drawer is closed) */}
            {!rightSidebarOpen && (
                <div className={`floating-drawer-trigger ${isTriggerExpanded ? 'expanded' : ''}`}>
                    <button
                        className="mobile-trigger-toggle"
                        onClick={() => setIsTriggerExpanded(!isTriggerExpanded)}
                        title="Toggle Menu"
                    >
                        {isTriggerExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <div className="trigger-items">
                        <button
                            className="btn-open-sim"
                            onClick={() => { setRightSidebar(true); setIsTriggerExpanded(false); }}
                        >
                            {simulation.active ? (
                                <div className="sim-active-dot" />
                            ) : (
                                <ListTree size={16} />
                            )}
                            <span>{simulation.active ? 'Simulation Log Live' : 'Simulation Log'}</span>
                        </button>
                        <a
                            href={APP_CONFIG.author.buyMeACoffee}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="floating-coffee-inline"
                            title="Buy me a coffee ☕"
                        >
                            <img
                                src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
                                alt="Coffee"
                            />
                        </a>
                    </div>
                </div>
            )}

            {/* Main Floating Drawer */}
            {rightSidebarOpen && (
                <motion.div
                    className="simulation-drawer"
                    initial={{ x: 420, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 420, opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                >
                    <div className="sim-drawer-content">
                        {/* Header */}
                        <div className="sim-drawer-header">
                            <div className="sim-drawer-title">
                                <ListTree size={18} className={`sim-icon ${simulation.active ? 'pulse' : ''}`} />
                                <span>Event Trace Log</span>
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

                        {/* Body Content */}
                        <div className="sim-drawer-log-container" style={{ height: 'calc(100% - 100px)' }}>
                            {hasLog ? (
                                <SimulationLog log={simulation.eventLog} />
                            ) : (
                                <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                                    <ListTree size={32} strokeWidth={1} style={{ opacity: 0.2, marginBottom: '16px' } as React.CSSProperties} />
                                    <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                                        Event Trace Log is empty. Open the <b>Event Dispatcher</b> from the HUD to inject data into the mesh.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Stats */}
                        {hasLog && (
                            <div className="sim-drawer-footer">
                                <div className="sim-summary" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                                    <div className="summary-stat">
                                        <BookOpen size={13} />
                                        <span>{simulation.visitedStreamIds?.length || 0} streams</span>
                                    </div>
                                    <div className="summary-stat">
                                        <Zap size={13} />
                                        <span>{simulation.visitedConsumerIds?.length || 0} consumers</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SimulationDrawer;
