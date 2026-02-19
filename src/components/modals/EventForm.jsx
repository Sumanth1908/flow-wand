import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';

const DEFAULT_SCHEMA = JSON.stringify({
    type: 'object',
    properties: {
        id: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        payload: { type: 'object' },
    },
    required: ['id', 'timestamp'],
}, null, 2);

const EventForm = ({ color }) => {
    const editingItem = useStore(s => s.editingItem);
    const closeModal = useStore(s => s.closeModal);
    const addEvent = useStore(s => s.addEvent);
    const updateEvent = useStore(s => s.updateEvent);

    const [name, setName] = useState(editingItem?.name || '');
    const [desc, setDesc] = useState(editingItem?.description || '');
    const [schema, setSchema] = useState(editingItem?.schema || DEFAULT_SCHEMA);
    const [schemaError, setSchemaError] = useState('');

    const validateSchema = (val) => {
        if (!val.trim()) { setSchemaError(''); return true; }
        try { JSON.parse(val); setSchemaError(''); return true; }
        catch (e) { setSchemaError(e.message); return false; }
    };

    const handleSchemaChange = (e) => {
        setSchema(e.target.value);
        validateSchema(e.target.value);
    };

    const handleSubmit = (e) => {
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
            <div className="form-group">
                <label>Event Name</label>
                <input
                    className="form-input"
                    value={name} autoFocus
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. OrderPlaced, UserSignedUp"
                />
                <span className="form-hint">Use PascalCase for event names</span>
            </div>

            <div className="form-group">
                <label>Description <span className="optional">(optional)</span></label>
                <textarea
                    className="form-textarea" rows={2} value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Describe when this event occurs…"
                />
            </div>

            <div className="form-group">
                <label>
                    JSON Schema
                    <span className="optional"> (optional)</span>
                </label>
                <textarea
                    className={`form-textarea form-textarea-mono${schemaError ? ' form-input-error' : ''}`}
                    rows={10}
                    value={schema}
                    onChange={handleSchemaChange}
                    spellCheck={false}
                    placeholder='{}'
                />
                {schemaError && (
                    <div className="form-error">
                        <AlertTriangle size={12} />
                        <span>{schemaError}</span>
                    </div>
                )}
            </div>

            <ModalFooter color={color} isEditing={!!editingItem} disabled={!!schemaError || !name.trim()} />
        </form>
    );
};

export default EventForm;
