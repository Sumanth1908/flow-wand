/**
 * components/simulation/SimulationLog.tsx
 * Shows the live event-by-event log with icons, timestamps, and optional payload.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Zap, ArrowRight, Clock, ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react';
import { Box, Stack, Typography, Collapse } from '@mui/material';

const EntryIcon = ({ type }: { type: string }) => {
    if (type === 'stream') return <BookOpen size={14} />;
    if (type === 'consumer') return <Zap size={14} />;
    if (type === 'warning') return <TriangleAlert size={14} />;
    return <ArrowRight size={14} />;
};

/** Collapsible JSON block */
const PayloadBlock = ({ label, data }: { label: string, data: any }) => {
    const [open, setOpen] = useState(false);
    if (!data) return null;
    return (
        <Box sx={{ mt: 1, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default', overflow: 'hidden' }}>
            <Box
                onClick={() => setOpen(v => !v)}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5,
                    cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                    userSelect: 'none'
                }}
            >
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: 10 }}>
                    {label}
                </Typography>
            </Box>
            <Collapse in={open}>
                <Box component="pre" sx={{
                    m: 0, p: 1, fontSize: 11, fontFamily: 'monospace',
                    overflowX: 'auto', bgcolor: 'rgba(0,0,0,0.2)', color: 'text.primary'
                }}>
                    {JSON.stringify(data, null, 2)}
                </Box>
            </Collapse>
        </Box>
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
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>
                <Typography variant="body2">Events will appear here…</Typography>
            </Box>
        );
    }

    return (
        <Stack spacing={1.5} sx={{ p: 2 }}>
            {log.map((entry, i) => (
                <Box
                    key={i}
                    sx={{
                        display: 'flex', gap: 1.5,
                        opacity: 0, animation: 'fadeIn 0.3s forwards',
                        '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateX(-10px)' }, to: { opacity: 1, transform: 'translateX(0)' } }
                    }}
                >
                    <Box sx={{
                        width: 28, height: 28, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        bgcolor: entry.type === 'stream' ? 'primary.main' : entry.type === 'consumer' ? 'warning.main' : entry.type === 'warning' ? 'error.main' : 'info.main',
                        color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                        <EntryIcon type={entry.type} />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.25 }}>
                                {entry.message}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.disabled', flexShrink: 0 }}>
                                <Clock size={10} />
                                <Typography variant="caption" sx={{ fontSize: 10 }}>
                                    {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </Typography>
                            </Stack>
                        </Stack>

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
                    </Box>
                </Box>
            ))}
            <div ref={endRef} />
        </Stack>
    );
};

export default SimulationLog;
