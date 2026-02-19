import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import { Square, Gauge, Activity, Clock, BookOpen, Zap, Trash2 } from 'lucide-react';

const SimulationPanel = () => {
    const {
        simulation,
        advanceSimulation,
        stopSimulation,
        clearSimulation,
        setSimulationSpeed,
    } = useStore();

    const intervalRef = useRef(null);
    const logEndRef = useRef(null);

    // Stable callback ref — avoids stale closure in setInterval
    const advanceRef = useRef(advanceSimulation);
    useEffect(() => { advanceRef.current = advanceSimulation; }, [advanceSimulation]);

    // Start / stop the interval only when active state or speed changes
    useEffect(() => {
        // Clear any existing interval first
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (simulation.active) {
            intervalRef.current = setInterval(() => {
                const hasMore = advanceRef.current();
                if (!hasMore) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simulation.active, simulation.speed]);

    // Auto-scroll log to bottom
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [simulation.eventLog?.length]);

    const hasLog = simulation.eventLog && simulation.eventLog.length > 0;

    if (!simulation.active && !hasLog) {
        return null;
    }

    const progress = simulation.totalSteps
        ? Math.round((simulation.currentStep / simulation.totalSteps) * 100)
        : 0;

    return (
        <AnimatePresence>
            <motion.div
                className="simulation-panel"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
                <div className="sim-panel-header">
                    <div className="sim-panel-title">
                        <Activity
                            size={16}
                            className={`sim-icon ${simulation.active ? 'pulse' : ''}`}
                        />
                        <span>Event Simulation</span>
                        {simulation.active && (
                            <span className="sim-status live">LIVE</span>
                        )}
                        {!simulation.active && hasLog && (
                            <span className="sim-status done">COMPLETE</span>
                        )}
                    </div>

                    <div className="sim-controls">
                        <div className="speed-control">
                            <Gauge size={13} />
                            <select
                                value={simulation.speed}
                                onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                                className="speed-select"
                                disabled={!simulation.active}
                            >
                                <option value={2000}>0.5×</option>
                                <option value={1000}>1×</option>
                                <option value={500}>2×</option>
                                <option value={250}>4×</option>
                            </select>
                        </div>

                        {simulation.active && (
                            <button className="btn-stop" onClick={stopSimulation}>
                                <Square size={13} />
                                <span>Stop</span>
                            </button>
                        )}
                        {!simulation.active && hasLog && (
                            <button className="btn-clear" onClick={clearSimulation} title="Clear log">
                                <Trash2 size={13} />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>
                </div>

                {simulation.active && simulation.totalSteps > 0 && (
                    <div className="sim-progress">
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

                <div className="sim-event-log">
                    {simulation.eventLog?.map((entry, i) => (
                        <motion.div
                            key={i}
                            className={`event-entry ${entry.type}`}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="event-icon">
                                {entry.type === 'topic' ? (
                                    <BookOpen size={12} />
                                ) : (
                                    <Zap size={12} />
                                )}
                            </div>
                            <div className="event-content">
                                <span className="event-message">{entry.message}</span>
                            </div>
                            <span className="event-time">
                                <Clock size={10} />
                                {new Date(entry.time).toLocaleTimeString()}
                            </span>
                        </motion.div>
                    ))}
                    <div ref={logEndRef} />
                </div>

                <div className="sim-summary">
                    <div className="summary-stat">
                        <BookOpen size={13} />
                        <span>{simulation.visitedTopicIds?.length || 0} topics</span>
                    </div>
                    <div className="summary-stat">
                        <Zap size={13} />
                        <span>{simulation.visitedJobIds?.length || 0} jobs</span>
                    </div>
                    {simulation.totalSteps > 0 && (
                        <div className="summary-stat">
                            <Activity size={13} />
                            <span>{simulation.currentStep}/{simulation.totalSteps} steps</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SimulationPanel;
