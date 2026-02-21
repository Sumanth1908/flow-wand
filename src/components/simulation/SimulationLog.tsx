/**
 * components/simulation/SimulationLog.tsx
 * Shows the live event-by-event log with icons, timestamps, and optional payload.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Zap, ArrowRight, Clock, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

const EntryIcon = ({ type }: { type: string }) => {
    if (type === 'stream') return <BookOpen size={12} />;
    if (type === 'consumer') return <Zap size={12} />;
    if (type === 'warning') return <AlertTriangle size={12} />;
    return <ArrowRight size={12} />;
};

/** Collapsible JSON block */
const PayloadBlock = ({ label, data }: { label: string, data: any }) => {
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

interface LogEntry {
    type: 'stream' | 'consumer' | 'info' | 'warning';
    message: string;
    time: string;
    payload?: any;
    outputPayload?: any;
}

const SimulationLog: React.FC<{ log: LogEntry[] }> = ({ log = [] }) => {
    const endRef = useRef<HTMLDivElement>(null);

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
                            {/* Input payload for stream entries */}
                            {entry.type === 'stream' && entry.payload && (
                                <PayloadBlock label="payload" data={entry.payload} />
                            )}
                            {/* Input + output payload for consumer entries */}
                            {entry.type === 'consumer' && (
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
