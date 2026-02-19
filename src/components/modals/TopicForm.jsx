import React, { useState, useEffect } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';

const TopicForm = ({ color }) => {
    const editingItem = useStore(s => s.editingItem);
    const closeModal = useStore(s => s.closeModal);
    const addTopic = useStore(s => s.addTopic);
    const updateTopic = useStore(s => s.updateTopic);
    const isTopicNameUnique = useStore(s => s.isTopicNameUnique);
    const events = useStore(s => s.events);

    const [name, setName] = useState(editingItem?.name || '');
    const [partitions, setParts] = useState(editingItem?.partitions || 1);
    const [desc, setDesc] = useState(editingItem?.description || '');
    const [eventIds, setEventIds] = useState(editingItem?.eventIds || []);
    const [error, setError] = useState('');

    useEffect(() => {
        if (name.trim()) {
            const excludeId = editingItem?.id ?? null;
            setError(isTopicNameUnique(name.trim(), excludeId) ? '' : `"${name.trim()}" already exists`);
        } else {
            setError('');
        }
    }, [name, editingItem, isTopicNameUnique]);

    const toggleEvent = (id) => {
        setEventIds(current =>
            current.includes(id) ? current.filter(x => x !== id) : [...current, id]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || error) return;
        const payload = {
            name: name.trim(),
            partitions,
            description: desc.trim(),
            eventIds
        };

        if (editingItem) {
            const ok = updateTopic(editingItem.id, payload);
            if (ok === false) return;
        } else {
            const result = addTopic(payload.name, payload.partitions, payload.description, payload.eventIds);
            if (!result) return;
        }
        closeModal();
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Topic Name</label>
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
                <label>Ingested Events</label>
                {events.length === 0 ? (
                    <div className="empty-selection">No events defined. Create events first.</div>
                ) : (
                    <div className="chip-selector">
                        {events.map(event => (
                            <button
                                key={event.id}
                                type="button"
                                className={`chip ${eventIds.includes(event.id) ? 'selected event-selected' : ''}`}
                                onClick={() => toggleEvent(event.id)}
                            >
                                {eventIds.includes(event.id) && <Check size={12} />}
                                {event.name}
                            </button>
                        ))}
                    </div>
                )}
                <span className="form-hint">Tag this topic with event types it carries</span>
            </div>

            <div className="form-group">
                <label>Partitions</label>
                <input
                    className="form-input" type="number" min={1} max={256}
                    value={partitions} onChange={e => setParts(parseInt(e.target.value) || 1)}
                />
            </div>
            <div className="form-group">
                <label>Description <span className="optional">(optional)</span></label>
                <textarea
                    className="form-textarea" rows={3} value={desc}
                    onChange={e => setDesc(e.target.value)} placeholder="Describe this topic…"
                />
            </div>
            <ModalFooter color={color} isEditing={!!editingItem} disabled={!!error} />
        </form>
    );
};
export default TopicForm;
