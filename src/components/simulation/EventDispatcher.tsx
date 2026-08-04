/**
 * components/simulation/EventDispatcher.tsx
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Play, TriangleAlert, RotateCcw } from 'lucide-react';
import { Box, Typography, Stack, Button, IconButton, Select, MenuItem, TextField, Divider } from '@mui/material';
import useStore from '../../store/useStore';
import { generateExampleFromSchema } from '../../lib/eventSchema';
import { JsonValue } from '../../types';

const DEFAULT_PAYLOAD = JSON.stringify({ key: 'value', timestamp: '{{now}}' }, null, 2);

interface EventDispatcherProps {
    onClose: () => void;
}

const EventDispatcher: React.FC<EventDispatcherProps> = ({ onClose }) => {
    const streams = useStore(s => s.streams);
    const consumers = useStore(s => s.consumers);
    const events = useStore(s => s.events);
    const startSimulation = useStore(s => s.startSimulation);

    const simulation = useStore(s => s.simulation);
    const editingItem = useStore(s => s.editingItem);

    const initialStreamId = (
        (typeof editingItem === 'string' ? editingItem : '') ||
        (streams.length > 0 ? streams[0].id : '')
    );
    const eventIdsForStream = (streamId: string) => {
        const ids = new Set<string>();
        consumers.forEach(consumer => consumer.sources
            .filter(source => source.streamId === streamId)
            .forEach(source => source.eventIds.forEach(id => ids.add(id))));
        return ids;
    };
    const initialEvent = events.find(event => eventIdsForStream(initialStreamId).has(event.id));

    const [selectedStreamId, setSelectedStreamId] = useState<string>(initialStreamId);
    const [selectedEventId, setSelectedEventId] = useState(initialEvent?.id ?? '');
    const [payload, setPayload] = useState(
        initialEvent ? JSON.stringify(generateExampleFromSchema(initialEvent), null, 2) : DEFAULT_PAYLOAD
    );
    const [payloadError, setPayloadError] = useState('');


    const selectableStreams = streams;

    const availableEvents = useMemo(() => {
        const ids = new Set<string>();
        consumers.forEach(consumer => {
            consumer.sources
                .filter(source => source.streamId === selectedStreamId)
                .forEach(source => source.eventIds.forEach(id => ids.add(id)));
        });
        return events.filter(event => ids.has(event.id));
    }, [consumers, events, selectedStreamId]);

    const selectEvent = (eventId: string) => {
        setSelectedEventId(eventId);
        const event = events.find(candidate => candidate.id === eventId);
        setPayload(event ? JSON.stringify(generateExampleFromSchema(event), null, 2) : DEFAULT_PAYLOAD);
        setPayloadError('');
    };

    const selectStream = (streamId: string) => {
        setSelectedStreamId(streamId);
        const ids = eventIdsForStream(streamId);
        const firstEvent = events.find(event => ids.has(event.id));
        selectEvent(firstEvent?.id ?? '');
    };

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
            ) as JsonValue;
            const payloads = Array.isArray(parsed) ? parsed : [parsed];
            onClose();
            startSimulation(selectedStreamId, payloads, selectedEventId || undefined);
        } catch {
            // Fallback
            onClose();
            startSimulation(selectedStreamId, {}, selectedEventId || undefined);
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
                            onChange={e => selectStream(e.target.value)}
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
                            onChange={e => selectEvent(e.target.value)}
                            displayEmpty
                            sx={{ width: 280, height: 36, fontSize: '13px' }}
                        >
                            <MenuItem value="">— None (Generic / Auto) —</MenuItem>
                            {availableEvents.map(ev => (
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


export default EventDispatcher;
