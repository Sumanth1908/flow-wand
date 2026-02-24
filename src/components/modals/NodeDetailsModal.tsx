import React from 'react';
import useStore from '../../store/useStore';
import { EventStream, Consumer } from '../../types';
import { BookOpen, Radio } from 'lucide-react';

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

    if (editingItem.type === 'stream') {
        const stream = editingItem.item as EventStream;
        // If stream.eventIds is removed, then streamEvents cannot be derived this way.
        // Assuming the intent is to remove the display of associated events for a stream.
        // The original code snippet provided for the change was malformed, so I'm interpreting the instruction directly.

        return (
            <div className="form-layout">
                <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Type</span>
                            <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, marginTop: '4px' }}>{stream.type.toUpperCase()}</div>
                        </div>
                        {stream.type === 'kafka' && (
                            <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Partitions</span>
                                <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, marginTop: '4px' }}>{stream.partitions}</div>
                            </div>
                        )}
                    </div>

                    <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Description</span>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                            {stream.description || <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>No description provided.</span>}
                        </div>
                    </div>

                    {/* The section displaying streamEvents is removed as stream.eventIds is no longer referenced */}
                </div>

                <div className="form-actions">
                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={closeModal} style={{ flex: 1 }}>Close</button>
                        <button type="button" className="btn-submit" style={{ background: color, borderColor: color, flex: 1 }} onClick={navToEdit}>
                            Edit
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (editingItem.type === 'consumer') {
        const consumer = editingItem.item as Consumer;
        const getEventNames = (eIds: string[]) => eIds.map(id => events.find(e => e.id === id)?.name).filter(Boolean);
        const streams = useStore.getState().streams;
        const getStreamName = (sid: string) => streams.find(s => s.id === sid)?.name || sid;

        return (
            <div className="form-layout">
                <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Consumer Name</span>
                        <div style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 600, marginTop: '4px' }}>{consumer.name}</div>
                    </div>

                    <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Description</span>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                            {consumer.description || <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>No description provided.</span>}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Sources ({consumer.sources.length})</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                {consumer.sources.length === 0 ? <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No sources</span> : consumer.sources.map((s, i) => (
                                    <div key={i} style={{ padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                                            <BookOpen size={12} fill="var(--indigo)" color="var(--indigo)" />
                                            {getStreamName(s.streamId)}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {getEventNames(s.eventIds).map((name, idx) => (
                                                <span key={idx} style={{ fontSize: '10px', background: 'color-mix(in srgb, var(--indigo) 10%, transparent)', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid color-mix(in srgb, var(--indigo) 20%, transparent)' }}>{name}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Sinks ({consumer.sinks.length})</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                {consumer.sinks.length === 0 ? <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No sinks</span> : consumer.sinks.map((s, i) => (
                                    <div key={i} style={{ padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                                            <BookOpen size={12} fill="var(--amber)" color="var(--amber)" />
                                            {getStreamName(s.streamId)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={closeModal} style={{ flex: 1 }}>Close</button>
                        <button type="button" className="btn-submit" style={{ background: color, borderColor: color, flex: 1 }} onClick={navToEdit}>
                            Edit
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default NodeDetailsModal;
