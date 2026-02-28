import React, { useState } from 'react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { EventType } from '../../types';
import { Stack, TextField, Typography } from '@mui/material';
import { TriangleAlert } from 'lucide-react';

const DEFAULT_SCHEMA = JSON.stringify({
    type: 'object',
    properties: {
        id: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        payload: { type: 'object' },
    },
    required: ['id', 'timestamp'],
}, null, 2);

interface EventFormProps {
    color: string;
}

const EventForm: React.FC<EventFormProps> = ({ color }) => {
    const editingItem = useStore(s => s.editingItem) as EventType | null;
    const closeModal = useStore(s => s.closeModal);
    const addEvent = useStore(s => s.addEvent);
    const updateEvent = useStore(s => s.updateEvent);

    const [name, setName] = useState(editingItem?.name || '');
    const [desc, setDesc] = useState(editingItem?.description || '');
    const [schema, setSchema] = useState(editingItem?.schema || DEFAULT_SCHEMA);
    const [schemaError, setSchemaError] = useState('');

    const validateSchema = (val: string) => {
        if (!val.trim()) { setSchemaError(''); return true; }
        try { JSON.parse(val); setSchemaError(''); return true; }
        catch (e: any) { setSchemaError(e.message); return false; }
    };

    const handleSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSchema(e.target.value);
        validateSchema(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !validateSchema(schema)) return;
        if (editingItem) {
            updateEvent(editingItem.id, { name: name.trim(), description: desc.trim(), schema });
        } else {
            addEvent(name.trim(), desc.trim(), schema);
        }
        closeModal();
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
                <TextField
                    label="Event Name"
                    fullWidth
                    size="small"
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. OrderPlaced, UserSignedUp"
                    helperText="Use PascalCase for event names"
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    label={<>Description <Typography component="span" variant="caption" color="text.secondary">(optional)</Typography></>}
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Describe when this event occurs…"
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    label={<>JSON Schema <Typography component="span" variant="caption" color="text.secondary">(optional)</Typography></>}
                    fullWidth
                    size="small"
                    multiline
                    rows={8}
                    value={schema}
                    onChange={handleSchemaChange}
                    spellCheck={false}
                    placeholder="{}"
                    error={!!schemaError}
                    helperText={schemaError}
                    InputProps={{
                        sx: { fontFamily: 'monospace', fontSize: 13 },
                    }}
                    InputLabelProps={{ shrink: true }}
                />
            </Stack>

            <ModalFooter color={color} isEditing={!!editingItem} disabled={!!schemaError || !name.trim()} />
        </form>
    );
};

export default EventForm;
