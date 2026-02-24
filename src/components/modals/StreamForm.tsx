import React, { useState, useEffect } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { EventStream, StreamType } from '../../types';

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
            <div className="form-group">
                <label>Stream Name</label>
                <input
                    className={`form-input ${error ? 'form-input-error' : ''}`}
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. user-events, order-stream" autoFocus
                />
                {error && (
                    <div className="form-error">
                        <AlertCircle size={12} /><span>{error}</span>
                    </div>
                )}
            </div>

            <div className="form-group">
                <label>Stream Type</label>
                <div className="stream-type-selector">
                    {STREAM_TYPES.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            className={`type-chip ${type === t.value ? 'selected' : ''}`}
                            onClick={() => setType(t.value)}
                            style={{ '--chip-color': color } as React.CSSProperties}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {type === 'kafka' && (
                <div className="form-group">
                    <label>Partitions</label>
                    <input
                        className="form-input" type="number" min={1} max={256}
                        value={partitions} onChange={e => setParts(parseInt(e.target.value) || 1)}
                    />
                </div>
            )}

            <div className="form-group">
                <label>Description <span className="optional">(optional)</span></label>
                <textarea
                    className="form-textarea" rows={2} value={desc}
                    onChange={e => setDesc(e.target.value)} placeholder="Describe this stream…"
                />
            </div>

            <ModalFooter color={color} isEditing={!!editingItem} disabled={!!error} />
        </form>
    );
};

export default StreamForm;
