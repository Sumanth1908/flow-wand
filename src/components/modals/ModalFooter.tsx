import React from 'react';
import useStore from '../../store/useStore';
import { Box, Button, alpha } from '@mui/material';

interface ModalFooterProps {
    color: string;
    isEditing: boolean;
    disabled?: boolean;
    submitLabel?: string;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ color, isEditing, disabled = false, submitLabel }) => {
    const closeModal = useStore(s => s.closeModal);
    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            mt: 4,
            pt: 2.5,
            borderTop: 1,
            borderColor: 'divider',
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            zIndex: 1
        }}>
            <Button
                onClick={closeModal}
                variant="text"
                sx={{
                    color: 'text.secondary',
                    fontWeight: '600',
                    px: 3,
                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' }
                }}
            >
                Cancel
            </Button>
            <Button
                type="submit"
                variant="contained"
                disabled={disabled}
                sx={{
                    bgcolor: color,
                    color: '#fff',
                    fontWeight: '700',
                    px: 4,
                    borderRadius: 2.5,
                    boxShadow: `0 4px 14px 0 ${alpha(color, 0.39)}`,
                    '&:hover': {
                        bgcolor: color,
                        filter: 'brightness(0.9)',
                        boxShadow: `0 6px 20px rgba(0,0,0,0.23)`
                    },
                    '&:active': {
                        transform: 'scale(0.98)',
                        boxShadow: 'none'
                    }
                }}
            >
                {submitLabel ?? (isEditing ? 'Save Changes' : 'Create')}
            </Button>
        </Box>
    );
};
export default ModalFooter;
