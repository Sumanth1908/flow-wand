/**
 * components/simulation/EventDispatcher.tsx
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Radio, ChevronDown, Code2, AlertTriangle, RotateCcw } from 'lucide-react';
import useStore from '../../store/useStore';

const DEFAULT_PAYLOAD = JSON.stringify({ key: 'value', timestamp: '{{now}}' }, null, 2);

interface EventDispatcherProps {
    onClose: () => void;
}

const EventDispatcher: React.FC<EventDispatcherProps> = ({ onClose }) => {
    const topics = useStore(s => s.topics);
    const startSimulation = useStore(s => s.startSimulation);
    const simulation = useStore(s => s.simulation);

    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
    const [payloadError, setPayloadError] = useState('');
    const [showPayload, setShowPayload] = useState(false);

    const selectableTopics = topics;

    const validatePayload = useCallback((val: string) => {
        if (!val.trim()) { setPayloadError(''); return true; }
        try {
            // Substitute {{now}} before parsing so template is valid JSON
            JSON.parse(val.replace(/\{\{now\}\}/g, new Date().toISOString()));
            setPayloadError('');
            return true;
        } catch (e: any) {
            setPayloadError(e.message.replace('JSON.parse: ', ''));
            return false;
        }
    }, []);

    const handlePayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPayload(e.target.value);
        validatePayload(e.target.value);
    };

    const handleFire = () => {
        if (!selectedTopicId) return;
        if (!validatePayload(payload)) return;

        let resolvedPayload = null;
        if (payload.trim()) {
            try {
                resolvedPayload = JSON.parse(
                    payload.replace(/\{\{now\}\}/g, new Date().toISOString())
                );
            } catch { /* already validated above */ }
        }
        onClose();
        startSimulation(selectedTopicId, resolvedPayload);
    };

    if (simulation.active) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="event-dispatcher"
                initial={{ opacity: 0, scale: 0.92, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            >
                {/* Header */}
                <div className="ed-header">
                    <div className="ed-title">
                        <Radio size={15} />
                        <span>Fire Event</span>
                    </div>
                    <button className="ed-close" onClick={onClose} title="Close">
                        <X size={14} />
                    </button>
                </div>

                <p className="ed-hint">
                    Pick a source topic and optionally attach a JSON payload to inject into your pipeline.
                </p>

                {selectableTopics.length === 0 ? (
                    <div className="ed-empty">
                        Create a Kafka topic first to simulate events.
                    </div>
                ) : (
                    <>
                        {/* Topic selector */}
                        <div className="ed-select-wrap">
                            <select
                                className="ed-select"
                                value={selectedTopicId}
                                onChange={e => setSelectedTopicId(e.target.value)}
                            >
                                <option value="">— choose a topic —</option>
                                {selectableTopics.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="ed-select-icon" />
                        </div>

                        {/* Payload toggle */}
                        <button
                            type="button"
                            className={`ed-payload-toggle ${showPayload ? 'active' : ''}`}
                            onClick={() => setShowPayload(v => !v)}
                        >
                            <Code2 size={13} />
                            <span>{showPayload ? 'Hide Payload' : 'Add Payload'}</span>
                            <span className="ed-payload-badge">JSON</span>
                        </button>

                        {/* Payload editor */}
                        <AnimatePresence>
                            {showPayload && (
                                <motion.div
                                    className="ed-payload-editor"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="ed-payload-header">
                                        <span className="ed-payload-label">Payload</span>
                                        <span className="ed-template-hint" title="{{now}} will be replaced with the current ISO timestamp">
                                            <code>{'{{now}}'}</code> → ISO timestamp
                                        </span>
                                        <button
                                            type="button"
                                            className="ed-reset-btn"
                                            title="Reset to default"
                                            onClick={() => { setPayload(DEFAULT_PAYLOAD); setPayloadError(''); }}
                                        >
                                            <RotateCcw size={11} />
                                        </button>
                                    </div>
                                    <textarea
                                        className={`ed-payload-textarea${payloadError ? ' ed-payload-error' : ''}`}
                                        value={payload}
                                        onChange={handlePayloadChange}
                                        spellCheck={false}
                                        rows={6}
                                        placeholder='{ "key": "value" }'
                                    />
                                    {payloadError && (
                                        <div className="ed-payload-err-msg">
                                            <AlertTriangle size={11} />
                                            <span>{payloadError}</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Fire button */}
                        <button
                            className="btn-fire"
                            onClick={handleFire}
                            disabled={!selectedTopicId || !!payloadError}
                        >
                            <Play size={14} />
                            <span>Send Event</span>
                        </button>
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default EventDispatcher;
