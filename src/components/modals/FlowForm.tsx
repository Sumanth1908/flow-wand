import React, { useState } from 'react';
import { Check } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { DataFlow } from '../../types';

const PALETTE = [
    { value: '#00FA9A', label: 'Neon Emerald' }, { value: '#5C33FF', label: 'Deep Indigo' },
    { value: '#FFB300', label: 'Bright Amber' }, { value: '#FF1133', label: 'Laser Red' },
    { value: '#A200FF', label: 'Neon Violet' }, { value: '#FF007F', label: 'Hot Pink' },
    { value: '#00FFFF', label: 'Cyber Cyan' }, { value: '#FF5E00', label: 'Blaze Orange' },
    { value: '#7CFC00', label: 'Electric Lime' }, { value: '#0000FF', label: 'Pure Blue' },
];

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
    const [flowColor, setColor] = useState(editingItem?.color || '#10b981');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (editingItem) {
            updateFlow(editingItem.id, { name: name.trim(), description: desc.trim(), consumerIds, color: flowColor });
        } else {
            addFlow(name.trim(), flowColor, consumerIds, desc.trim());
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
                <label>Consumers in this Flow</label>
                {consumers.length === 0
                    ? <div className="empty-selection">No consumers yet — create consumers first.</div>
                    : (
                        <div className="chip-selector">
                            {consumers.map(j => (
                                <button
                                    key={j.id} type="button"
                                    className={`chip ${consumerIds.includes(j.id) ? 'selected' : ''}`}
                                    style={consumerIds.includes(j.id) ? { borderColor: flowColor, color: flowColor, background: `${flowColor}18` } as React.CSSProperties : {}}
                                    onClick={() => setConsumerIds(toggle(consumerIds, j.id))}
                                >
                                    {consumerIds.includes(j.id) && <Check size={12} />}
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
