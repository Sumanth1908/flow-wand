import React, { useState } from 'react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { Stack, TextField, Typography } from '@mui/material';

interface ProjectFormProps {
    color: string;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ color }) => {
    const closeModal = useStore(s => s.closeModal);
    const createProject = useStore(s => s.createProject);

    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        createProject(name.trim(), desc.trim());
        closeModal();
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
                <TextField
                    label="Project Name"
                    fullWidth
                    size="small"
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Order Processing Pipeline"
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label={<>Description <Typography component="span" variant="caption" color="text.secondary">(optional)</Typography></>}
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Describe this project…"
                    InputLabelProps={{ shrink: true }}
                />
            </Stack>
            <ModalFooter color={color} isEditing={false} submitLabel="Create Project" />
        </form>
    );
};
export default ProjectForm;
