import React, { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { EventStream, StreamType } from '../../types';
import { Stack, TextField, MenuItem, Typography } from '@mui/material';

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
        };

        if (editingItem) {
            updateStream(editingItem.id, data);
        } else {
            addStream(data.name, data.type, data.partitions, data.description);
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
            </Stack>

            <ModalFooter color={color} isEditing={!!editingItem} disabled={!!error} />
        </form>
    );
};

export default StreamForm;
