import React, { useState } from 'react';
import { Check } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { DataFlow } from '../../types';

const PALETTE = [
    { value: '#10b981', label: 'Emerald' }, { value: '#6366f1', label: 'Indigo' },
    { value: '#f59e0b', label: 'Amber' }, { value: '#ef4444', label: 'Red' },
    { value: '#8b5cf6', label: 'Violet' }, { value: '#ec4899', label: 'Pink' },
    { value: '#14b8a6', label: 'Teal' }, { value: '#f97316', label: 'Orange' },
    { value: '#06b6d4', label: 'Cyan' }, { value: '#84cc16', label: 'Lime' },
];

const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

interface FlowFormProps {
    color: string;
}

const FlowForm: React.FC<FlowFormProps> = ({ color }) => {
    const editingItem = useStore(s => s.editingItem) as DataFlow | null;
    const closeModal = useStore(s => s.closeModal);
    const flinkJobs = useStore(s => s.flinkJobs);
    const addFlow = useStore(s => s.addFlow);
    const updateFlow = useStore(s => s.updateFlow);

    const [name, setName] = useState(editingItem?.name || '');
    const [desc, setDesc] = useState(editingItem?.description || '');
    const [jobIds, setJobIds] = useState<string[]>(editingItem?.jobIds || []);
    const [flowColor, setColor] = useState(editingItem?.color || '#10b981');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (editingItem) {
            updateFlow(editingItem.id, { name: name.trim(), description: desc.trim(), jobIds, color: flowColor });
        } else {
            addFlow(name.trim(), flowColor, jobIds, desc.trim());
        }
        closeModal();
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Flow Name</label>
                <input className="form-input" value={name} autoFocus
                    onChange={e => setName(e.target.value)} placeholder="e.g. order-processing-pipeline" />
            </div>

            <div className="form-group">
                <label>Color</label>
                <div className="color-swatch-grid">
                    {PALETTE.map(c => (
                        <button
                            key={c.value} type="button"
                            className={`color-swatch ${flowColor === c.value ? 'color-swatch-selected' : ''}`}
                            style={{ '--swatch-color': c.value } as React.CSSProperties}
                            title={c.label}
                            onClick={() => setColor(c.value)}
                        >
                            {flowColor === c.value && <Check size={12} />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label>Description <span className="optional">(optional)</span></label>
                <textarea className="form-textarea" rows={2} value={desc}
                    onChange={e => setDesc(e.target.value)} placeholder="Describe this flow…" />
            </div>

            <div className="form-group">
                <label>Flink Jobs in this Flow</label>
                {flinkJobs.length === 0
                    ? <div className="empty-selection">No jobs yet — create Flink jobs first.</div>
                    : (
                        <div className="chip-selector">
                            {flinkJobs.map(j => (
                                <button
                                    key={j.id} type="button"
                                    className={`chip ${jobIds.includes(j.id) ? 'selected' : ''}`}
                                    style={jobIds.includes(j.id) ? { borderColor: flowColor, color: flowColor, background: `${flowColor}18` } as React.CSSProperties : {}}
                                    onClick={() => setJobIds(toggle(jobIds, j.id))}
                                >
                                    {jobIds.includes(j.id) && <Check size={12} />}
                                    {j.name}
                                </button>
                            ))}
                        </div>
                    )
                }
            </div>

            <ModalFooter color={color} isEditing={!!editingItem} />
        </form>
    );
};

export default FlowForm;
