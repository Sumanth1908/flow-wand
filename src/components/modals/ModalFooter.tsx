import React from 'react';
import useStore from '../../store/useStore';

interface ModalFooterProps {
    color: string;
    isEditing: boolean;
    disabled?: boolean;
    submitLabel?: string;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ color, isEditing, disabled = false, submitLabel }) => {
    const closeModal = useStore(s => s.closeModal);
    return (
        <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
            <button
                type="submit"
                className="btn-submit"
                style={{ '--btn-color': color } as React.CSSProperties}
                disabled={disabled}
            >
                {submitLabel ?? (isEditing ? 'Save Changes' : 'Create')}
            </button>
        </div>
    );
};
export default ModalFooter;
