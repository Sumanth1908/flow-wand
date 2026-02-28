import React, { useState } from 'react';
import { Check } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { DataFlow } from '../../types';
import { Stack, TextField, Typography, Box, Chip, IconButton } from '@mui/material';

const PALETTE = [
    { value: '#00FA9A', label: 'Neon Emerald' }, { value: '#5C33FF', label: 'Deep Indigo' },
    { value: '#FFB300', label: 'Bright Amber' }, { value: '#FF1133', label: 'Laser Red' },
    { value: '#A200FF', label: 'Neon Violet' }, { value: '#FF007F', label: 'Hot Pink' },
    { value: '#00FFFF', label: 'Cyber Cyan' }, { value: '#FF5E00', label: 'Blaze Orange' },
    { value: '#7CFC00', label: 'Electric Lime' }, { value: '#0000FF', label: 'Pure Blue' },
];

const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

interface FlowFormProps {
    color: string;
}

const FlowForm: React.FC<FlowFormProps> = ({ color }) => {
    const editingItem = useStore(s => s.editingItem) as DataFlow | null;
    const closeModal = useStore(s => s.closeModal);
    const consumers = useStore(s => s.consumers);
    const addFlow = useStore(s => s.addFlow);
    const updateFlow = useStore(s => s.updateFlow);

    const [name, setName] = useState(editingItem?.name || '');
    const [desc, setDesc] = useState(editingItem?.description || '');
    const [consumerIds, setConsumerIds] = useState<string[]>(editingItem?.consumerIds || []);
    const [flowColor, setColor] = useState(editingItem?.color || '#10b981');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (editingItem) {
            updateFlow(editingItem.id, { name: name.trim(), description: desc.trim(), consumerIds, color: flowColor });
        } else {
            addFlow(name.trim(), flowColor, consumerIds, desc.trim());
        }
        closeModal();
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
                <TextField
                    label="Flow Name"
                    fullWidth
                    size="small"
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. order-processing-pipeline"
                    InputLabelProps={{ shrink: true }}
                />

                <Box>
                    <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>Color</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {PALETTE.map(c => (
                            <IconButton
                                key={c.value}
                                onClick={() => setColor(c.value)}
                                title={c.label}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: c.value,
                                    color: '#fff',
                                    '&:hover': { bgcolor: c.value, filter: 'brightness(1.1)' },
                                    boxShadow: flowColor === c.value ? `0 0 0 3px ${c.value}40` : 'none',
                                    border: 2,
                                    borderColor: flowColor === c.value ? 'background.paper' : 'transparent',
                                }}
                            >
                                {flowColor === c.value && <Check size={16} strokeWidth={3} />}
                            </IconButton>
                        ))}
                    </Box>
                </Box>

                <TextField
                    label={<>Description <Typography component="span" variant="caption" color="text.secondary">(optional)</Typography></>}
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Describe this flow…"
                    InputLabelProps={{ shrink: true }}
                />

                <Box>
                    <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>Consumers in this Flow</Typography>
                    {consumers.length === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No consumers yet — create consumers first.
                        </Typography>
                    ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {consumers.map(j => {
                                const isSelected = consumerIds.includes(j.id);
                                return (
                                    <Chip
                                        key={j.id}
                                        label={j.name}
                                        onClick={() => setConsumerIds(toggle(consumerIds, j.id))}
                                        variant={isSelected ? 'filled' : 'outlined'}
                                        size="small"
                                        icon={isSelected ? <Check size={14} /> : undefined}
                                        sx={{
                                            borderRadius: 1.5,
                                            fontWeight: isSelected ? 'bold' : 'normal',
                                            transition: 'all 0.2s',
                                            ...(isSelected && {
                                                bgcolor: `${flowColor}26`, // 15% opacity
                                                color: flowColor,
                                                borderColor: flowColor,
                                                border: 1,
                                                '& .lucide': { color: flowColor }
                                            }),
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    )}
                </Box>
            </Stack>

            <ModalFooter color={color} isEditing={!!editingItem} />
        </form>
    );
};

export default FlowForm;
