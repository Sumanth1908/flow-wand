/**
 * components/modals/Modal.tsx
 */
import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { X, BookOpen, Zap, GitBranch, FolderOpen, Radio } from 'lucide-react';
import useStore from '../../store/useStore';
import TopicForm from './TopicForm';
import JobForm from './JobForm';
import FlowForm from './FlowForm';
import ProjectForm from './ProjectForm';
import EventForm from './EventForm';

const BACKDROP: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const MODAL_V: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
};

const ICON_MAP: Record<string, any> = { topic: BookOpen, job: Zap, flow: GitBranch, project: FolderOpen, event: Radio };
const TITLE_MAP = (editing: boolean): Record<string, string> => ({
    topic: editing ? 'Edit Topic' : 'New Kafka Topic',
    job: editing ? 'Edit Flink Job' : 'New Flink Job',
    flow: editing ? 'Edit Flow' : 'New Flow',
    project: 'New Project',
    event: editing ? 'Edit Event' : 'New Event Type',
});
const COLOR_MAP: Record<string, string> = { topic: '#6366f1', job: '#f59e0b', flow: '#10b981', project: '#8b5cf6', event: '#ec4899' };

const Modal: React.FC = () => {
    const modalOpen = useStore(s => s.modalOpen);
    const editingItem = useStore(s => s.editingItem);
    const closeModal = useStore(s => s.closeModal);

    if (!modalOpen) return null;

    const Icon = ICON_MAP[modalOpen];
    const color = COLOR_MAP[modalOpen] ?? '#6366f1';
    const title = TITLE_MAP(!!editingItem)[modalOpen];

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
                            {modalOpen === 'topic' && <TopicForm color={color} />}
                            {modalOpen === 'job' && <JobForm color={color} />}
                            {modalOpen === 'flow' && <FlowForm color={color} />}
                            {modalOpen === 'project' && <ProjectForm color={color} />}
                            {modalOpen === 'event' && <EventForm color={color} />}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
