import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import { X, BookOpen, Zap, GitBranch, Check, FolderOpen, AlertCircle } from 'lucide-react';

const backdrop = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modal = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
};

const Modal = () => {
    const {
        modalOpen,
        editingItem,
        closeModal,
        addTopic,
        updateTopic,
        addFlinkJob,
        updateFlinkJob,
        addFlow,
        updateFlow,
        topics,
        flinkJobs,
        isTopicNameUnique,
        createProject,
    } = useStore();

    // Topic form
    const [topicName, setTopicName] = useState('');
    const [topicPartitions, setTopicPartitions] = useState(1);
    const [topicDescription, setTopicDescription] = useState('');
    const [topicNameError, setTopicNameError] = useState('');

    // Job form
    const [jobName, setJobName] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [jobSourceTopics, setJobSourceTopics] = useState([]);
    const [jobSinkTopics, setJobSinkTopics] = useState([]);

    // Flow form
    const [flowName, setFlowName] = useState('');
    const [flowDescription, setFlowDescription] = useState('');
    const [flowJobIds, setFlowJobIds] = useState([]);
    const [flowColor, setFlowColor] = useState('#10b981');

    // Predefined flow color palette
    const FLOW_COLORS = [
        { value: '#10b981', label: 'Emerald' },
        { value: '#6366f1', label: 'Indigo' },
        { value: '#f59e0b', label: 'Amber' },
        { value: '#ef4444', label: 'Red' },
        { value: '#8b5cf6', label: 'Violet' },
        { value: '#ec4899', label: 'Pink' },
        { value: '#14b8a6', label: 'Teal' },
        { value: '#f97316', label: 'Orange' },
        { value: '#06b6d4', label: 'Cyan' },
        { value: '#84cc16', label: 'Lime' },
    ];

    // Project form
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');

    useEffect(() => {
        setTopicNameError('');
        if (editingItem) {
            if (modalOpen === 'topic') {
                setTopicName(editingItem.name || '');
                setTopicPartitions(editingItem.partitions || 1);
                setTopicDescription(editingItem.description || '');
            } else if (modalOpen === 'job') {
                setJobName(editingItem.name || '');
                setJobDescription(editingItem.description || '');
                setJobSourceTopics(editingItem.sourceTopics || []);
                setJobSinkTopics(editingItem.sinkTopics || []);
            } else if (modalOpen === 'flow') {
                setFlowName(editingItem.name || '');
                setFlowDescription(editingItem.description || '');
                setFlowJobIds(editingItem.jobIds || []);
                setFlowColor(editingItem.color || '#10b981');
            }
        } else {
            setTopicName('');
            setTopicPartitions(1);
            setTopicDescription('');
            setJobName('');
            setJobDescription('');
            setJobSourceTopics([]);
            setJobSinkTopics([]);
            setFlowName('');
            setFlowDescription('');
            setFlowJobIds([]);
            setFlowColor('#10b981');
            setProjectName('');
            setProjectDescription('');
        }
    }, [modalOpen, editingItem]);

    // Validate topic name uniqueness in real time
    useEffect(() => {
        if (modalOpen === 'topic' && topicName.trim()) {
            const excludeId = editingItem?.id || null;
            if (!isTopicNameUnique(topicName.trim(), excludeId)) {
                setTopicNameError(`Topic "${topicName.trim()}" already exists`);
            } else {
                setTopicNameError('');
            }
        } else {
            setTopicNameError('');
        }
    }, [topicName, modalOpen, editingItem, isTopicNameUnique]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (modalOpen === 'project') {
            if (!projectName.trim()) return;
            createProject(projectName.trim(), projectDescription.trim());
            closeModal();
            return;
        }

        if (modalOpen === 'topic') {
            if (!topicName.trim()) return;

            // Check uniqueness
            const excludeId = editingItem?.id || null;
            if (!isTopicNameUnique(topicName.trim(), excludeId)) {
                setTopicNameError(`Topic "${topicName.trim()}" already exists`);
                return;
            }

            if (editingItem) {
                const result = updateTopic(editingItem.id, {
                    name: topicName.trim(),
                    partitions: topicPartitions,
                    description: topicDescription.trim(),
                });
                if (result === false) return; // Uniqueness failed
            } else {
                const result = addTopic(topicName.trim(), topicPartitions, topicDescription.trim());
                if (!result) return; // Uniqueness failed
            }
        } else if (modalOpen === 'job') {
            if (!jobName.trim()) return;
            if (editingItem) {
                updateFlinkJob(editingItem.id, {
                    name: jobName.trim(),
                    sourceTopics: jobSourceTopics,
                    sinkTopics: jobSinkTopics,
                    description: jobDescription.trim(),
                });
            } else {
                addFlinkJob(
                    jobName.trim(),
                    jobSourceTopics,
                    jobSinkTopics,
                    jobDescription.trim()
                );
            }
        } else if (modalOpen === 'flow') {
            if (!flowName.trim()) return;
            if (editingItem) {
                updateFlow(editingItem.id, {
                    name: flowName.trim(),
                    jobIds: flowJobIds,
                    description: flowDescription.trim(),
                    color: flowColor,
                });
            } else {
                addFlow(flowName.trim(), flowJobIds, flowDescription.trim(), flowColor);
            }
        }

        closeModal();
    };

    const toggleArrayItem = (arr, setArr, item) => {
        if (arr.includes(item)) {
            setArr(arr.filter((i) => i !== item));
        } else {
            setArr([...arr, item]);
        }
    };

    const iconMap = {
        topic: <BookOpen size={20} />,
        job: <Zap size={20} />,
        flow: <GitBranch size={20} />,
        project: <FolderOpen size={20} />,
    };

    const titleMap = {
        topic: editingItem ? 'Edit Topic' : 'New Kafka Topic',
        job: editingItem ? 'Edit Flink Job' : 'New Flink Job',
        flow: editingItem ? 'Edit Flow' : 'New Flow',
        project: 'New Project',
    };

    const colorMap = {
        topic: '#6366f1',
        job: '#f59e0b',
        flow: '#10b981',
        project: '#8b5cf6',
    };

    if (!modalOpen) return null;

    return (
        <AnimatePresence>
            {modalOpen && (
                <motion.div
                    className="modal-backdrop"
                    variants={backdrop}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onClick={closeModal}
                >
                    <motion.div
                        className="modal"
                        variants={modal}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header" style={{ '--modal-color': colorMap[modalOpen] }}>
                            <div className="modal-title-row">
                                <div className="modal-icon" style={{ color: colorMap[modalOpen] }}>
                                    {iconMap[modalOpen]}
                                </div>
                                <h2>{titleMap[modalOpen]}</h2>
                            </div>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
                            {modalOpen === 'project' && (
                                <>
                                    <div className="form-group">
                                        <label>Project Name</label>
                                        <input
                                            type="text"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            placeholder="e.g. Order Processing Pipeline"
                                            autoFocus
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Description <span className="optional">(optional)</span></label>
                                        <textarea
                                            value={projectDescription}
                                            onChange={(e) => setProjectDescription(e.target.value)}
                                            placeholder="Describe this project..."
                                            className="form-textarea"
                                            rows={3}
                                        />
                                    </div>
                                </>
                            )}

                            {modalOpen === 'topic' && (
                                <>
                                    <div className="form-group">
                                        <label>Topic Name</label>
                                        <input
                                            type="text"
                                            value={topicName}
                                            onChange={(e) => setTopicName(e.target.value)}
                                            placeholder="e.g. user-events, order-stream"
                                            autoFocus
                                            className={`form-input ${topicNameError ? 'form-input-error' : ''}`}
                                        />
                                        {topicNameError && (
                                            <div className="form-error">
                                                <AlertCircle size={12} />
                                                <span>{topicNameError}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>Partitions</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={256}
                                            value={topicPartitions}
                                            onChange={(e) => setTopicPartitions(parseInt(e.target.value) || 1)}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Description <span className="optional">(optional)</span></label>
                                        <textarea
                                            value={topicDescription}
                                            onChange={(e) => setTopicDescription(e.target.value)}
                                            placeholder="Describe this topic..."
                                            className="form-textarea"
                                            rows={3}
                                        />
                                    </div>
                                </>
                            )}

                            {modalOpen === 'job' && (
                                <>
                                    <div className="form-group">
                                        <label>Job Name</label>
                                        <input
                                            type="text"
                                            value={jobName}
                                            onChange={(e) => setJobName(e.target.value)}
                                            placeholder="e.g. enrichment-job, aggregator"
                                            autoFocus
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Description <span className="optional">(optional)</span></label>
                                        <textarea
                                            value={jobDescription}
                                            onChange={(e) => setJobDescription(e.target.value)}
                                            placeholder="Describe this job..."
                                            className="form-textarea"
                                            rows={2}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Source Topics <span className="optional">(reads from)</span></label>
                                        {topics.length === 0 ? (
                                            <div className="empty-selection">No topics available. Create topics first.</div>
                                        ) : (
                                            <div className="chip-selector">
                                                {topics.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        className={`chip ${jobSourceTopics.includes(t.id) ? 'selected source-selected' : ''}`}
                                                        onClick={() =>
                                                            toggleArrayItem(
                                                                jobSourceTopics,
                                                                setJobSourceTopics,
                                                                t.id
                                                            )
                                                        }
                                                    >
                                                        {jobSourceTopics.includes(t.id) && <Check size={12} />}
                                                        {t.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>Sink Topics <span className="optional">(writes to)</span></label>
                                        {topics.length === 0 ? (
                                            <div className="empty-selection">No topics available. Create topics first.</div>
                                        ) : (
                                            <div className="chip-selector">
                                                {topics.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        className={`chip ${jobSinkTopics.includes(t.id) ? 'selected sink-selected' : ''}`}
                                                        onClick={() =>
                                                            toggleArrayItem(
                                                                jobSinkTopics,
                                                                setJobSinkTopics,
                                                                t.id
                                                            )
                                                        }
                                                    >
                                                        {jobSinkTopics.includes(t.id) && <Check size={12} />}
                                                        {t.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {modalOpen === 'flow' && (
                                <>
                                    <div className="form-group">
                                        <label>Flow Name</label>
                                        <input
                                            type="text"
                                            value={flowName}
                                            onChange={(e) => setFlowName(e.target.value)}
                                            placeholder="e.g. order-processing-pipeline"
                                            autoFocus
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Color</label>
                                        <div className="color-swatch-grid">
                                            {FLOW_COLORS.map((c) => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    className={`color-swatch ${flowColor === c.value ? 'color-swatch-selected' : ''}`}
                                                    style={{ '--swatch-color': c.value }}
                                                    title={c.label}
                                                    onClick={() => setFlowColor(c.value)}
                                                >
                                                    {flowColor === c.value && <Check size={12} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Description <span className="optional">(optional)</span></label>
                                        <textarea
                                            value={flowDescription}
                                            onChange={(e) => setFlowDescription(e.target.value)}
                                            placeholder="Describe this flow..."
                                            className="form-textarea"
                                            rows={2}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Flink Jobs in this Flow</label>
                                        {flinkJobs.length === 0 ? (
                                            <div className="empty-selection">No jobs available. Create Flink jobs first.</div>
                                        ) : (
                                            <div className="chip-selector">
                                                {flinkJobs.map((j) => (
                                                    <button
                                                        key={j.id}
                                                        type="button"
                                                        className={`chip ${flowJobIds.includes(j.id) ? 'selected' : ''}`}
                                                        style={flowJobIds.includes(j.id) ? { '--chip-active': flowColor, borderColor: flowColor, color: flowColor, background: `${flowColor}18` } : {}}
                                                        onClick={() =>
                                                            toggleArrayItem(
                                                                flowJobIds,
                                                                setFlowJobIds,
                                                                j.id
                                                            )
                                                        }
                                                    >
                                                        {flowJobIds.includes(j.id) && <Check size={12} />}
                                                        {j.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    style={{ '--btn-color': colorMap[modalOpen] }}
                                    disabled={modalOpen === 'topic' && !!topicNameError}
                                >
                                    {modalOpen === 'project'
                                        ? 'Create Project'
                                        : editingItem
                                            ? 'Save Changes'
                                            : 'Create'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
