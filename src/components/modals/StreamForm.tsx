import React, { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { EventStream, StreamType } from '../../types';
import { Stack, TextField, MenuItem, Typography, Box } from '@mui/material';

interface StreamFormProps {
    color: string;
}

const STREAM_TYPES: { value: StreamType; label: string }[] = [
    { value: 'kafka', label: 'Kafka Topic' },
    { value: 'sqs', label: 'AWS SQS' },
    { value: 'sns', label: 'AWS SNS' },
    { value: 'other', label: 'Other' },
];

const StreamForm: React.FC<StreamFormProps> = ({ color }) => {
    const editingItem = useStore(s => s.editingItem) as EventStream | null;
    const closeModal = useStore(s => s.closeModal);
    const addStream = useStore(s => s.addStream);
    const updateStream = useStore(s => s.updateStream);
    const isStreamNameUnique = useStore(s => s.isStreamNameUnique);

    const [name, setName] = useState(editingItem?.name || '');
    const [type, setType] = useState<StreamType>(editingItem?.type || 'kafka');
    const [partitions, setParts] = useState(editingItem?.partitions || 1);
    const [desc, setDesc] = useState(editingItem?.description || '');
    const [isDLQ, setIsDLQ] = useState(editingItem?.isDLQ ?? false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (name.trim()) {
            const excludeId = editingItem?.id ?? null;
            setError(isStreamNameUnique(name.trim(), excludeId) ? '' : `"${name.trim()}" already exists`);
        } else {
            setError('');
        }
    }, [name, editingItem, isStreamNameUnique]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || error) return;

        const data = {
            name: name.trim(),
            type,
            partitions: type === 'kafka' ? partitions : 1,
            description: desc.trim(),
            isDLQ,
        };

        if (editingItem) {
            updateStream(editingItem.id, data);
        } else {
            addStream(data.name, data.type, data.partitions, data.description, data.isDLQ);
        }
        closeModal();
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
                <TextField
                    label="Stream Name"
                    fullWidth
                    size="small"
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. user-events, order-stream"
                    error={!!error}
                    helperText={error}
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    select
                    label="Stream Type"
                    fullWidth
                    size="small"
                    value={type}
                    onChange={e => setType(e.target.value as StreamType)}
                    InputLabelProps={{ shrink: true }}
                >
                    {STREAM_TYPES.map(t => (
                        <MenuItem key={t.value} value={t.value}>
                            {t.label}
                        </MenuItem>
                    ))}
                </TextField>

                {type === 'kafka' && (
                    <TextField
                        label="Partitions"
                        type="number"
                        fullWidth
                        size="small"
                        inputProps={{ min: 1, max: 256 }}
                        value={partitions}
                        onChange={e => setParts(parseInt(e.target.value) || 1)}
                        InputLabelProps={{ shrink: true }}
                    />
                )}

                <TextField
                    label={<>Description <Typography component="span" variant="caption" color="text.secondary">(optional)</Typography></>}
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Describe this stream…"
                    InputLabelProps={{ shrink: true }}
                />

                {/* DLQ Toggle */}
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    onClick={() => setIsDLQ(v => !v)}
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: 1,
                        borderColor: isDLQ ? 'error.main' : 'divider',
                        bgcolor: isDLQ ? 'rgba(239,68,68,0.06)' : 'transparent',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': { borderColor: isDLQ ? 'error.dark' : 'text.secondary' },
                    }}
                >
                    <Stack spacing={0.3}>
                        <Typography variant="body2" fontWeight="700" color={isDLQ ? 'error.main' : 'text.primary'}>
                            ☠&nbsp; Mark as Dead Letter Queue (DLQ)
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                            {isDLQ
                                ? 'Hidden from canvas — used only as a failure sink on consumers.'
                                : 'Enable to route failed messages from consumers here.'}
                        </Typography>
                    </Stack>
                    {/* Toggle pill */}
                    <Box
                        sx={{
                            width: 38, height: 22, borderRadius: 11, ml: 2, flexShrink: 0,
                            bgcolor: isDLQ ? 'error.main' : 'action.disabled',
                            transition: 'background-color 0.2s ease',
                            position: 'relative',
                        }}
                    >
                        <Box
                            sx={{
                                width: 16, height: 16, borderRadius: '50%',
                                bgcolor: 'white',
                                position: 'absolute',
                                top: 3,
                                left: isDLQ ? 19 : 3,
                                transition: 'left 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }}
                        />
                    </Box>
                </Stack>
            </Stack>

            <ModalFooter color={isDLQ ? '#ef4444' : color} isEditing={!!editingItem} disabled={!!error} />
        </form>
    );
};

export default StreamForm;

