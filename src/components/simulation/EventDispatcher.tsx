/**
 * components/simulation/EventDispatcher.tsx
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Play, Radio, Code2, TriangleAlert, RotateCcw, FileJson } from 'lucide-react';
import { Box, Typography, Stack, Button, IconButton, Select, MenuItem, TextField, Divider } from '@mui/material';
import useStore from '../../store/useStore';

const DEFAULT_PAYLOAD = JSON.stringify({ key: 'value', timestamp: '{{now}}' }, null, 2);

interface EventDispatcherProps {
    onClose: () => void;
}

const EventDispatcher: React.FC<EventDispatcherProps> = ({ onClose }) => {
    const streams = useStore(s => s.streams);
    const consumers = useStore(s => s.consumers);
    const events = useStore(s => s.events);
    const startSimulation = useStore(s => s.startSimulation);
    const setMaxLoops = useStore(s => s.setMaxLoops);
    const simulation = useStore(s => s.simulation);
    const editingItem = useStore(s => s.editingItem);

    const [selectedStreamId, setSelectedStreamId] = useState<string>(
        (typeof editingItem === 'string' ? editingItem : '') ||
        (streams.length > 0 ? streams[0].id : '')
    );
    const [selectedEventId, setSelectedEventId] = useState('');
    const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
    const [payloadError, setPayloadError] = useState('');
    const [showPayload, setShowPayload] = useState(true);

    const selectableStreams = streams;

    // Load payload from event schema when selected
    useEffect(() => {
        if (selectedEventId) {
            const event = events.find(e => e.id === selectedEventId);
            if (event && event.schema) {
                try {
                    // Try to prettify the schema for the editor
                    const pretty = JSON.stringify(JSON.parse(event.schema), null, 2);
                    setPayload(pretty);
                    setPayloadError('');
                } catch {
                    setPayload(event.schema);
                }
            }
        }
    }, [selectedEventId, events]);

    // Intelligent payload inferring when stream changes (existing logic)
    useEffect(() => {
        if (!selectedStreamId || selectedEventId) return;

        const streamEventIds = new Set<string>();
        consumers.forEach(consumer => {
            (consumer.sources || []).forEach(source => {
                if (source.streamId === selectedStreamId) {
                    (source.eventIds || []).forEach(eid => streamEventIds.add(eid));
                }
            });
        });

        const streamEvents = Array.from(streamEventIds)
            .map(id => events.find(e => e.id === id))
            .filter(Boolean);

        if (streamEvents.length > 0) {
            try {
                const parsedSchemas = streamEvents.map(e => {
                    let str = e!.schema.replace(/"ISO-8601"/g, '"{{now}}"');
                    str = str.replace(/"number"/g, '0');
                    str = str.replace(/"string"/g, '"{{index}}"');
                    return JSON.parse(str);
                });

                const newPayload = parsedSchemas.length === 1
                    ? JSON.stringify(parsedSchemas[0], null, 2)
                    : JSON.stringify(parsedSchemas, null, 2);

                setPayload(newPayload);
                setPayloadError('');
            } catch (err) {
                console.error("Failed to auto-infer payload", err);
            }
        }
    }, [selectedStreamId, selectedEventId, consumers, events]);

    const validatePayload = useCallback((val: string) => {
        if (!val.trim()) { setPayloadError(''); return true; }
        try {
            JSON.parse(val.replace(/\{\{now\}\}/g, new Date().toISOString()));
            setPayloadError('');
            return true;
        } catch (e: any) {
            setPayloadError(e.message.replace('JSON.parse: ', ''));
            return false;
        }
    }, []);

    const handlePayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPayload(e.target.value);
        validatePayload(e.target.value);
    };

    const handleFire = () => {
        if (!selectedStreamId) return;
        if (!validatePayload(payload)) return;

        try {
            const parsed = JSON.parse(
                payload.replace(/\{\{now\}\}/g, () => new Date().toISOString())
                    .replace(/\{\{index\}\}/g, "1")
            );
            const payloads = Array.isArray(parsed) ? parsed : [parsed];
            onClose();
            startSimulation(selectedStreamId, payloads);
        } catch {
            // Fallback
            onClose();
            startSimulation(selectedStreamId, {});
        }
    };

    if (simulation.active) return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">Simulation is already running.</Typography>
        </Box>
    );

    return (
        <Stack spacing={3} sx={{ mt: 1 }}>
            <Box>
                <Typography variant="overline" color="text.secondary" fontWeight="900" sx={{ display: 'block', mb: 1, letterSpacing: 1.2 }}>Entry Point</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Select where the event enters the system and which payload template to use.
                </Typography>

                <Stack spacing={2.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight="600">Source Stream</Typography>
                        <Select
                            size="small"
                            value={selectedStreamId}
                            onChange={e => setSelectedStreamId(e.target.value)}
                            displayEmpty
                            sx={{ width: 280, height: 36, fontSize: '13px' }}
                        >
                            <MenuItem value="" disabled>— choose a stream —</MenuItem>
                            {selectableStreams.map(t => (
                                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                            ))}
                        </Select>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight="600">Event Template</Typography>
                            <Typography variant="caption" color="text.secondary">Pre-load a specific event type's schema</Typography>
                        </Stack>
                        <Select
                            size="small"
                            value={selectedEventId}
                            onChange={e => setSelectedEventId(e.target.value)}
                            displayEmpty
                            sx={{ width: 280, height: 36, fontSize: '13px' }}
                        >
                            <MenuItem value="">— None (Generic / Auto) —</MenuItem>
                            {events.map(ev => (
                                <MenuItem key={ev.id} value={ev.id}>{ev.name}</MenuItem>
                            ))}
                        </Select>
                    </Box>
                </Stack>
            </Box>

            <Divider />

            <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="overline" color="text.secondary" fontWeight="900" sx={{ letterSpacing: 1.2 }}>Payload Editor</Typography>
                        <Box sx={{ ml: 1, px: 0.6, py: 0.2, bgcolor: 'primary.main', color: '#fff', borderRadius: 0.5, fontSize: 9, fontWeight: 'bold' }}>JSON</Box>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => { setPayload(DEFAULT_PAYLOAD); setSelectedEventId(''); setPayloadError(''); }} title="Reset">
                            <RotateCcw size={14} />
                        </IconButton>
                    </Stack>
                </Stack>

                <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                    <TextField
                        multiline
                        rows={10}
                        value={payload}
                        onChange={handlePayloadChange}
                        fullWidth
                        error={!!payloadError}
                        variant="outlined"
                        InputProps={{
                            sx: {
                                fontFamily: 'monospace',
                                fontSize: 13,
                                bgcolor: 'background.paper'
                            }
                        }}
                    />
                    {payloadError ? (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5, color: 'error.main' }}>
                            <TriangleAlert size={14} />
                            <Typography variant="caption" fontWeight="600">{payloadError}</Typography>
                        </Stack>
                    ) : (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1, textAlign: 'right' }}>
                            Tip: use {"{{now}}"} for current time
                        </Typography>
                    )}
                </Box>
            </Box>

            <Box sx={{ pt: 1 }}>
                <Button
                    variant="contained"
                    color="primary"
                    disabled={!selectedStreamId || !!payloadError}
                    onClick={handleFire}
                    startIcon={<Play size={18} />}
                    fullWidth
                    size="large"
                    sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 2 }}
                >
                    Inject Event & Start Simulation
                </Button>
            </Box>
        </Stack>
    );
};

// Simple Badge component if MUI Badge isn't styled this way in their version
const Badge: React.FC<{ badgeContent: string, color: string, children: React.ReactNode, sx?: any }> = ({ badgeContent, children }) => (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {children}
        <Box sx={{ ml: 1, px: 0.6, py: 0.2, bgcolor: 'primary.main', color: '#fff', borderRadius: 0.5, fontSize: 9, fontWeight: 'bold' }}>
            {badgeContent}
        </Box>
    </Box>
);

export default EventDispatcher;
