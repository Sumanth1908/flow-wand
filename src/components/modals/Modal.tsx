/**
 * components/modals/Modal.tsx
 */
import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { X, BookOpen, Zap, GitBranch, FolderOpen, Radio, AlertTriangle } from 'lucide-react';
import useStore from '../../store/useStore';
import StreamForm from './StreamForm';
import ConsumerForm from './ConsumerForm';
import FlowForm from './FlowForm';
import ProjectForm from './ProjectForm';
import EventForm from './EventForm';
import ConfirmForm from './ConfirmForm';
import NodeDetailsModal from './NodeDetailsModal';

const BACKDROP: Variants = {
    hidden: { opacity: 0, transition: { duration: 0.1 } },
    visible: { opacity: 1, transition: { duration: 0.15 } }
};
const MODAL_V: Variants = {
    hidden: { opacity: 0, scale: 0.99, y: 5 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } },
    exit: { opacity: 0, scale: 0.99, y: 2, transition: { duration: 0.08 } },
};

const ICON_MAP: Record<string, any> = { stream: BookOpen, consumer: Zap, flow: GitBranch, project: FolderOpen, event: Radio, confirm: AlertTriangle };
const TITLE_MAP = (editing: boolean): Record<string, string> => ({
    stream: editing ? 'Edit Stream' : 'New Event Stream',
    consumer: editing ? 'Edit Consumer' : 'New Consumer',
    flow: editing ? 'Edit Flow' : 'New Flow',
    project: 'New Project',
    event: editing ? 'Edit Event' : 'New Event Type',
});
const COLOR_MAP: Record<string, string> = { stream: '#6366f1', consumer: '#f59e0b', flow: '#10b981', project: '#8b5cf6', event: '#ec4899', confirm: '#ef4444' };

const Modal: React.FC = () => {
    const modalOpen = useStore(s => s.modalOpen);
    const editingItem = useStore(s => s.editingItem);
    const closeModal = useStore(s => s.closeModal);

    if (!modalOpen) return null;

    let Icon = ICON_MAP[modalOpen];
    let color = COLOR_MAP[modalOpen] ?? '#6366f1';
    let title = modalOpen === 'confirm' ? (editingItem?.title || 'Confirm') : TITLE_MAP(!!editingItem)[modalOpen];

    if (modalOpen === 'nodeDetails' && editingItem) {
        Icon = ICON_MAP[editingItem.type] || BookOpen;
        color = editingItem.type === 'stream' ? '#6366f1' : '#f59e0b';
        title = editingItem.type === 'stream' ? 'Stream Details' : 'Consumer Details';
    }

    return (
        <AnimatePresence>
            {modalOpen && (
                <motion.div
                    className="modal-backdrop"
                    variants={BACKDROP} initial="hidden" animate="visible" exit="hidden"
                    onClick={closeModal}
                >
                    <motion.div
                        className="modal"
                        variants={MODAL_V} initial="hidden" animate="visible" exit="exit"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header" style={{ '--modal-color': color } as React.CSSProperties}>
                            <div className="modal-title-row">
                                <div className="modal-icon" style={{ color }}>
                                    {Icon && <Icon size={20} />}
                                </div>
                                <h2>{title}</h2>
                            </div>
                            <button className="modal-close" onClick={closeModal}><X size={18} /></button>
                        </div>

                        <div className="modal-body">
                            {modalOpen === 'stream' && <StreamForm color={color} />}
                            {modalOpen === 'consumer' && <ConsumerForm color={color} />}
                            {modalOpen === 'flow' && <FlowForm color={color} />}
                            {modalOpen === 'project' && <ProjectForm color={color} />}
                            {modalOpen === 'event' && <EventForm color={color} />}
                            {modalOpen === 'confirm' && <ConfirmForm color={color} />}
                            {modalOpen === 'nodeDetails' && <NodeDetailsModal color={color} />}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
