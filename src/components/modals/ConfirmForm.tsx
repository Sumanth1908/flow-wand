import React from 'react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';

interface ConfirmFormProps {
    color: string;
}

const ConfirmForm: React.FC<ConfirmFormProps> = ({ color }) => {
    const editingItem = useStore(s => s.editingItem);
    const closeModal = useStore(s => s.closeModal);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem?.onConfirm) {
            editingItem.onConfirm();
        }
        closeModal();
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {editingItem?.message || 'Are you sure you want to proceed?'}
                </p>
                {editingItem?.subMessage && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {editingItem.subMessage}
                    </p>
                )}
            </div>
            <ModalFooter color={color} isEditing={false} submitLabel={editingItem?.confirmLabel || 'Confirm'} />
        </form>
    );
};

export default ConfirmForm;
