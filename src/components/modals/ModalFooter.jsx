import React from 'react';
import useStore from '../../store/useStore';

const ModalFooter = ({ color, isEditing, disabled = false, submitLabel }) => {
    const closeModal = useStore(s => s.closeModal);
    return (
        <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
            <button
                type="submit"
                className="btn-submit"
                style={{ '--btn-color': color }}
                disabled={disabled}
            >
                {submitLabel ?? (isEditing ? 'Save Changes' : 'Create')}
            </button>
        </div>
    );
};
export default ModalFooter;
