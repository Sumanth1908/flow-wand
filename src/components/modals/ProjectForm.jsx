import React, { useState } from 'react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';

const ProjectForm = ({ color }) => {
    const closeModal = useStore(s => s.closeModal);
    const createProject = useStore(s => s.createProject);

    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        createProject(name.trim(), desc.trim());
        closeModal();
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Project Name</label>
                <input className="form-input" value={name} autoFocus
                    onChange={e => setName(e.target.value)} placeholder="e.g. Order Processing Pipeline" />
            </div>
            <div className="form-group">
                <label>Description <span className="optional">(optional)</span></label>
                <textarea className="form-textarea" rows={3} value={desc}
                    onChange={e => setDesc(e.target.value)} placeholder="Describe this project…" />
            </div>
            <ModalFooter color={color} isEditing={false} submitLabel="Create Project" />
        </form>
    );
};
export default ProjectForm;
