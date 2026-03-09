import React from 'react';
import useStore from '../../store/useStore';
import { EventStream, Consumer } from '../../types';
import { BookOpen } from 'lucide-react';
import { Box, Typography, Stack, Button, Chip } from '@mui/material';

interface Props {
    color: string;
}

const NodeDetailsModal: React.FC<Props> = ({ color }) => {
    const editingItem = useStore(s => s.editingItem);
    const events = useStore(s => s.events);
    const closeModal = useStore(s => s.closeModal);
    const openModal = useStore(s => s.openModal);

    if (!editingItem) return null;

    const navToEdit = () => {
        openModal(editingItem.type, editingItem.item);
    };

    const Label = ({ children }: { children: React.ReactNode }) => (
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold', letterSpacing: 1, display: 'block', mb: 0.5 }}>
            {children}
        </Typography>
    );

    if (editingItem.type === 'stream') {
        const stream = editingItem.item as EventStream;

        return (
            <Stack spacing={3}>
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 2 }}>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                            <Label>Type</Label>
                            <Typography variant="body1" fontWeight={500}>{stream.type.toUpperCase()}</Typography>
                        </Box>
                        {stream.type === 'kafka' && (
                            <Box>
                                <Label>Partitions</Label>
                                <Typography variant="body1" fontWeight={500}>{stream.partitions}</Typography>
                            </Box>
                        )}
                    </Box>

                    <Box>
                        <Label>Description</Label>
                        {stream.description ? (
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                                {stream.description}
                            </Typography>
                        ) : (
                            <Typography variant="body2" color="text.disabled" fontStyle="italic">
                                No description provided.
                            </Typography>
                        )}
                    </Box>
                </Box>

                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button variant="outlined" color="inherit" onClick={closeModal} sx={{ flex: 1, textTransform: 'none' }}>
                        Close
                    </Button>
                    <Button variant="contained" onClick={navToEdit} sx={{ flex: 1, bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' }, textTransform: 'none' }}>
                        Edit
                    </Button>
                </Stack>
            </Stack>
        );
    }

    if (editingItem.type === 'consumer') {
        const consumer = editingItem.item as Consumer;
        const getEventNames = (eIds: string[]) => eIds.map(id => events.find(e => e.id === id)?.name).filter(Boolean);
        const streams = useStore.getState().streams;
        const getStreamName = (sid: string) => streams.find(s => s.id === sid)?.name || sid;

        return (
            <Stack spacing={3}>
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 2 }}>

                    <Box>
                        <Label>Consumer Name</Label>
                        <Typography variant="h6" fontWeight="bold">{consumer.name}</Typography>
                    </Box>

                    <Box>
                        <Label>Description</Label>
                        {consumer.description ? (
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                                {consumer.description}
                            </Typography>
                        ) : (
                            <Typography variant="body2" color="text.disabled" fontStyle="italic">
                                No description provided.
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mt: 1 }}>
                        <Box>
                            <Label>Sources ({consumer.sources.length})</Label>
                            <Stack spacing={1} sx={{ mt: 1 }}>
                                {consumer.sources.length === 0 ? (
                                    <Typography variant="caption" color="text.disabled">No sources</Typography>
                                ) : (
                                    consumer.sources.map((s, i) => (
                                        <Box key={i} sx={{ p: 1.5, bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                                <BookOpen size={14} color="#6366f1" />
                                                <Typography variant="caption" fontWeight="bold">{getStreamName(s.streamId)}</Typography>
                                            </Stack>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {getEventNames(s.eventIds).map((name, idx) => (
                                                    <Chip key={idx} label={name} size="small" sx={{ fontSize: 10, height: 20, bgcolor: 'primary.light', color: 'white' }} />
                                                ))}
                                            </Box>
                                        </Box>
                                    ))
                                )}
                            </Stack>
                        </Box>

                        <Box>
                            <Label>Sinks ({consumer.sinks.length})</Label>
                            <Stack spacing={1} sx={{ mt: 1 }}>
                                {consumer.sinks.length === 0 ? (
                                    <Typography variant="caption" color="text.disabled">No sinks</Typography>
                                ) : (
                                    consumer.sinks.map((s, i) => (
                                        <Box key={i} sx={{ p: 1.5, bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <BookOpen size={14} color="#f59e0b" />
                                                <Typography variant="caption" fontWeight="bold">{getStreamName(s.streamId)}</Typography>
                                            </Stack>
                                        </Box>
                                    ))
                                )}
                            </Stack>
                        </Box>
                    </Box>
                </Box>

                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button variant="outlined" color="inherit" onClick={closeModal} sx={{ flex: 1, textTransform: 'none' }}>
                        Close
                    </Button>
                    <Button variant="contained" onClick={navToEdit} sx={{ flex: 1, bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' }, textTransform: 'none' }}>
                        Edit
                    </Button>
                </Stack>
            </Stack>
        );
    }

    return null;
};

export default NodeDetailsModal;
