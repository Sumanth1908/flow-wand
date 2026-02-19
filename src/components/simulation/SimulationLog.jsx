/**
 * components/simulation/SimulationLog.jsx
 * Shows the live event-by-event log with icons, timestamps, and optional payload.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Zap, ArrowRight, Clock, ChevronDown, ChevronRight } from 'lucide-react';

const EntryIcon = ({ type }) => {
    if (type === 'topic') return <BookOpen size={12} />;
    if (type === 'job') return <Zap size={12} />;
    return <ArrowRight size={12} />;
};

/** Collapsible JSON block */
const PayloadBlock = ({ label, data }) => {
    const [open, setOpen] = useState(false);
    if (!data) return null;
    return (
        <div className="payload-block">
            <button
                type="button"
                className="payload-toggle"
                onClick={() => setOpen(v => !v)}
            >
                {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <span>{label}</span>
            </button>
            {open && (
                <pre className="payload-json">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    );
};

const SimulationLog = ({ log = [] }) => {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log.length]);

    if (log.length === 0) {
        return (
            <div className="sim-event-log sim-log-empty">
                <span>Events will appear here…</span>
            </div>
        );
    }

    return (
        <div className="sim-event-log">
            {log.map((entry, i) => (
                <motion.div
                    key={i}
                    className={`event-entry ${entry.type}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <div className="event-entry-main">
                        <div className="event-icon">
                            <EntryIcon type={entry.type} />
                        </div>
                        <div className="event-content">
                            <span className="event-message">{entry.message}</span>
                            {/* Input payload for topic entries */}
                            {entry.type === 'topic' && entry.payload && (
                                <PayloadBlock label="payload" data={entry.payload} />
                            )}
                            {/* Input + output payload for job entries */}
                            {entry.type === 'job' && (
                                <>
                                    {entry.payload && <PayloadBlock label="input" data={entry.payload} />}
                                    {entry.outputPayload && <PayloadBlock label="output" data={entry.outputPayload} />}
                                </>
                            )}
                        </div>
                        <span className="event-time">
                            <Clock size={10} />
                            {new Date(entry.time).toLocaleTimeString()}
                        </span>
                    </div>
                </motion.div>
            ))}
            <div ref={endRef} />
        </div>
    );
};

export default SimulationLog;
