import React, { useState } from 'react';
import { Check } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { Consumer, StreamConnection } from '../../types';

const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

interface ConsumerFormProps {
    color: string;
}

const ConsumerForm: React.FC<ConsumerFormProps> = ({ color }) => {
    const editingItem = useStore(s => s.editingItem) as Consumer | null;
    const closeModal = useStore(s => s.closeModal);
    const streams = useStore(s => s.streams);
    const events = useStore(s => s.events);
    const addConsumer = useStore(s => s.addConsumer);
    const updateConsumer = useStore(s => s.updateConsumer);

    const [name, setName] = useState(editingItem?.name || '');
    const [desc, setDesc] = useState(editingItem?.description || '');

    // State is now arrays of StreamConnection
    const [sources, setSources] = useState<StreamConnection[]>(editingItem?.sources || []);
    const [sinks, setSinks] = useState<StreamConnection[]>(editingItem?.sinks || []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (editingItem) {
            updateConsumer(editingItem.id, {
                name: name.trim(),
                description: desc.trim(),
                sources,
                sinks
            });
        } else {
            addConsumer(name.trim(), desc.trim(), sources, sinks);
        }
        closeModal();
    };

    const toggleStream = (connList: StreamConnection[], streamId: string) => {
        const exists = connList.find(c => c.streamId === streamId);
        if (exists) {
            return connList.filter(c => c.streamId !== streamId);
        } else {
            return [...connList, { streamId, eventIds: [] }];
        }
    };

    const toggleEventOnStream = (connList: StreamConnection[], streamId: string, eventId: string) => {
        return connList.map(c => {
            if (c.streamId === streamId) {
                const hasEvent = c.eventIds.includes(eventId);
                return {
                    ...c,
                    eventIds: hasEvent ? c.eventIds.filter(id => id !== eventId) : [...c.eventIds, eventId]
                };
            }
            return c;
        });
    };

    const StreamSelector = ({ selected, onToggle, label }: { selected: StreamConnection[], onToggle: (id: string) => void, label: string }) => (
        <div className="form-group">
            <label>{label}</label>
            {streams.length === 0
                ? <div className="empty-selection">No streams available — create one first.</div>
                : (
                    <div className="chip-selector">
                        {streams.map(s => {
                            const isSelected = selected.some(c => c.streamId === s.id);
                            return (
                                <button
                                    key={s.id} type="button"
                                    className={`chip ${isSelected ? `selected ${label.toLowerCase().includes('source') ? 'source-selected' : 'sink-selected'}` : ''}`}
                                    onClick={() => onToggle(s.id)}
                                >
                                    {isSelected && <Check size={12} />}
                                    {s.name}
                                </button>
                            );
                        })}
                    </div>
                )
            }
        </div>
    );

    const ConnectionDetails = ({ connections, onToggleEvent, type }: { connections: StreamConnection[], onToggleEvent: (sId: string, eId: string) => void, type: 'source' | 'sink' }) => (
        <div className="connection-details">
            {connections.map(conn => {
                const stream = streams.find(s => s.id === conn.streamId);
                if (!stream) return null;
                return (
                    <div key={conn.streamId} className="connection-card">
                        <div className="connection-card-header">
                            <span className={`connection-dot ${type}`}></span>
                            <span className="connection-stream-name">{stream.name}</span>
                        </div>
                        <div className="connection-events">
                            {events.length === 0 ? (
                                <span className="no-events-hint">No events defined</span>
                            ) : (
                                events.map(event => (
                                    <button
                                        key={event.id}
                                        type="button"
                                        className={`event-mini-chip ${conn.eventIds.includes(event.id) ? 'selected' : ''}`}
                                        onClick={() => onToggleEvent(conn.streamId, event.id)}
                                    >
                                        {event.name}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="consumer-form-v2">
            <div className="form-group">
                <label>Consumer Name</label>
                <input
                    className="form-input" value={name} autoFocus
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. enrichment-job, aggregator"
                />
            </div>
            <div className="form-group">
                <label>Description <span className="optional">(optional)</span></label>
                <textarea className="form-textarea" rows={1} value={desc}
                    onChange={e => setDesc(e.target.value)} placeholder="Describe this job…" />
            </div>

            <div className="form-columns">
                <div className="form-col">
                    <h4 className="col-title">Inbound (Sources)</h4>
                    <StreamSelector
                        selected={sources}
                        onToggle={id => setSources(toggleStream(sources, id))}
                        label="Select Source Streams"
                    />
                    <ConnectionDetails
                        connections={sources}
                        onToggleEvent={(sId, eId) => setSources(toggleEventOnStream(sources, sId, eId))}
                        type="source"
                    />
                </div>
                <div className="form-col">
                    <h4 className="col-title">Outbound (Sinks)</h4>
                    <StreamSelector
                        selected={sinks}
                        onToggle={id => setSinks(toggleStream(sinks, id))}
                        label="Select Sink Streams"
                    />
                    <ConnectionDetails
                        connections={sinks}
                        onToggleEvent={(sId, eId) => setSinks(toggleEventOnStream(sinks, sId, eId))}
                        type="sink"
                    />
                </div>
            </div>

            <ModalFooter color={color} isEditing={!!editingItem} />
        </form>
    );
};

export default ConsumerForm;
