import React from 'react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { Box, Typography } from '@mui/material';

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
            <Box sx={{ mb: 3 }}>
                <Typography variant="body1" color="text.primary" sx={{ lineHeight: 1.5 }}>
                    {editingItem?.message || 'Are you sure you want to proceed?'}
                </Typography>
                {editingItem?.subMessage && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {editingItem.subMessage}
                    </Typography>
                )}
            </Box>
            <ModalFooter color={color} isEditing={false} submitLabel={editingItem?.confirmLabel || 'Confirm'} />
        </form>
    );
};

export default ConfirmForm;
