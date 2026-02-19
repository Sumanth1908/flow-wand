import React, { useState } from 'react';
import { Check } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';

const toggle = (arr, item) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

const JobForm = ({ color }) => {
    const editingItem = useStore(s => s.editingItem);
    const closeModal = useStore(s => s.closeModal);
    const topics = useStore(s => s.topics);
    const addFlinkJob = useStore(s => s.addFlinkJob);
    const updateFlinkJob = useStore(s => s.updateFlinkJob);

    const [name, setName] = useState(editingItem?.name || '');
    const [desc, setDesc] = useState(editingItem?.description || '');
    const [source, setSource] = useState(editingItem?.sourceTopics || []);
    const [sink, setSink] = useState(editingItem?.sinkTopics || []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (editingItem) {
            updateFlinkJob(editingItem.id, { name: name.trim(), description: desc.trim(), sourceTopics: source, sinkTopics: sink });
        } else {
            addFlinkJob(name.trim(), source, sink, desc.trim());
        }
        closeModal();
    };

    const ChipList = ({ selected, onToggle, label }) => (
        <div className="form-group">
            <label>{label}</label>
            {topics.length === 0
                ? <div className="empty-selection">No topics yet — create some first.</div>
                : (
                    <div className="chip-selector">
                        {topics.map(t => (
                            <button
                                key={t.id} type="button"
                                className={`chip ${selected.includes(t.id) ? `selected ${label.toLowerCase().startsWith('source') ? 'source-selected' : 'sink-selected'}` : ''}`}
                                onClick={() => onToggle(t.id)}
                            >
                                {selected.includes(t.id) && <Check size={12} />}
                                {t.name}
                            </button>
                        ))}
                    </div>
                )
            }
        </div>
    );

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Job Name</label>
                <input
                    className="form-input" value={name} autoFocus
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. enrichment-job, aggregator"
                />
            </div>
            <div className="form-group">
                <label>Description <span className="optional">(optional)</span></label>
                <textarea className="form-textarea" rows={2} value={desc}
                    onChange={e => setDesc(e.target.value)} placeholder="Describe this job…" />
            </div>
            <ChipList selected={source} onToggle={id => setSource(toggle(source, id))} label="Source Topics (reads from)" />
            <ChipList selected={sink} onToggle={id => setSink(toggle(sink, id))} label="Sink Topics (writes to)" />
            <ModalFooter color={color} isEditing={!!editingItem} />
        </form>
    );
};
export default JobForm;
