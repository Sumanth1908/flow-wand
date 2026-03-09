import React, { useState } from 'react';
import { Check } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { DataFlow } from '../../types';
import { Stack, TextField, Typography, Box, Chip } from '@mui/material';


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


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (editingItem) {
            updateFlow(editingItem.id, { name: name.trim(), description: desc.trim(), consumerIds });
        } else {
            addFlow(name.trim(), consumerIds, desc.trim());
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

                {/* Color selection removed to keep flows simple as per user request */}

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
                                                bgcolor: `${color}26`, // 15% opacity
                                                color: color,
                                                borderColor: color,
                                                border: 1,
                                                '& .lucide': { color: color }
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
