import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import {
    BookOpen,
    Zap,
    GitBranch,
    Plus,
    Trash2,
    Edit3,
    Play,
    ChevronDown,
    Layers,
    Search,
    Sun,
    Moon,
    Download,
    Upload,
    FolderOpen,
    Save,
    Radio,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';

interface TabItem {
    id: 'topics' | 'jobs' | 'flows' | 'events';
    label: string;
    icon: any;
    color: string;
}

const tabs: TabItem[] = [
    { id: 'topics', label: 'Topics', icon: BookOpen, color: '#6366f1' },
    { id: 'jobs', label: 'Jobs', icon: Zap, color: '#f59e0b' },
    { id: 'flows', label: 'Flows', icon: GitBranch, color: '#10b981' },
    { id: 'events', label: 'Events', icon: Radio, color: '#ec4899' },
];

const formatTimestamp = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Sidebar: React.FC = () => {
    const {
        sidebarTab,
        setSidebarTab,
        leftSidebarOpen,
        setLeftSidebar,
        topics,
        flinkJobs,
        flows,
        events,
        openModal,
        deleteTopic,
        deleteFlinkJob,
        deleteFlow,
        deleteEvent,
        activeFlowId,
        setActiveFlow,
        startSimulation,
        simulation,
        projects,
        activeProjectId,
        switchProject,
        deleteProject,
        theme,
        toggleTheme,
        saveProject,
        exportProject,
        importProject,
        lastSavedAt,
    } = useStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeProject = projects.find((p) => p.id === activeProjectId);

    const filteredTopics = topics.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredJobs = flinkJobs.filter((j) =>
        j.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredFlows = flows.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredEvents = (events || []).filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSimulate = (topicId: string) => {
        if (!simulation.active) {
            startSimulation(topicId);
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) importProject(file);
        e.target.value = '';
    };

    if (!leftSidebarOpen) {
        return (
            <div className="sidebar collapsed">
                <div className="sidebar-header" style={{ padding: '16px 8px' }}>
                    <button className="sidebar-toggle-btn" onClick={() => setLeftSidebar(true)}>
                        <PanelLeftOpen size={20} />
                    </button>
                </div>
                <div className="collapsed-sidebar-content">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            className={`collapsed-icon ${sidebarTab === tab.id ? 'active' : ''}`}
                            onClick={() => { setLeftSidebar(true); setSidebarTab(tab.id); }}
                            title={tab.label}
                        >
                            <tab.icon size={20} />
                        </div>
                    ))}
                    <div className="collapsed-icon" onClick={toggleTheme} title="Toggle Theme">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-header-top">
                    <div className="logo-container">
                        <div className="logo-icon">
                            <Layers size={20} />
                        </div>
                        <div className="logo-text">
                            <h1>FlowWand</h1>
                            <div className="logo-subtitle">Event Mesh Designer</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn-theme-toggle" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <button className="sidebar-toggle-btn" onClick={() => setLeftSidebar(false)}>
                            <PanelLeftClose size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Project Selector */}
            <div className="project-selector">
                <button
                    className="project-selector-btn"
                    onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                >
                    <FolderOpen size={14} className="folder-icon" />
                    <span className="project-name">{activeProject?.name || 'Select Project'}</span>
                    <ChevronDown size={14} className={`dropdown-arrow ${projectDropdownOpen ? 'open' : ''}`} />
                </button>
                <div className="project-actions">
                    <button className="btn-icon-sm btn-save" onClick={saveProject} title="Save project">
                        <Save size={14} />
                    </button>
                    <button className="btn-icon-sm" onClick={exportProject} title="Export as JSON">
                        <Download size={14} />
                    </button>
                    <button
                        className="btn-icon-sm"
                        onClick={() => fileInputRef.current?.click()}
                        title="Import JSON"
                    >
                        <Upload size={14} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        style={{ display: 'none' }}
                        accept=".json"
                    />
                </div>
            </div>

            {lastSavedAt && (
                <div className="last-saved-indicator">
                    <span>Last saved: {formatTimestamp(lastSavedAt)}</span>
                </div>
            )}

            <AnimatePresence>
                {projectDropdownOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="project-dropdown"
                    >
                        {projects.map((p) => (
                            <div key={p.id} className={`project-dropdown-item ${p.id === activeProjectId ? 'active' : ''}`}>
                                <button
                                    className="project-dropdown-btn"
                                    onClick={() => {
                                        switchProject(p.id);
                                        setProjectDropdownOpen(false);
                                    }}
                                >
                                    {p.name}
                                </button>
                                <button
                                    className="btn-icon-xs"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete project "${p.name}" and all its data?`)) {
                                            deleteProject(p.id);
                                        }
                                    }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                        <button className="project-dropdown-new" onClick={() => {
                            openModal('project');
                            setProjectDropdownOpen(false);
                        }}>
                            <Plus size={14} />
                            <span>Create New Project</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {activeProjectId ? (
                <>
                    {/* Search */}
                    <div className="sidebar-search">
                        <div className="search-input-wrapper">
                            <Search className="search-icon" size={14} />
                            <input
                                type="text"
                                className="search-input"
                                placeholder={`Search ${sidebarTab}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="sidebar-tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`sidebar-tab ${sidebarTab === tab.id ? 'active' : ''}`}
                                onClick={() => setSidebarTab(tab.id)}
                                style={{ '--tab-color': tab.color } as React.CSSProperties}
                            >
                                <tab.icon size={15} />
                                <span>{tab.label}</span>
                                <span className="tab-count">
                                    {tab.id === 'topics'
                                        ? topics.length
                                        : tab.id === 'jobs'
                                            ? flinkJobs.length
                                            : tab.id === 'events'
                                                ? events.length
                                                : flows.length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* List Content */}
                    <div className="sidebar-content">
                        <AnimatePresence mode="wait">
                            {sidebarTab === 'topics' && (
                                <motion.div
                                    key="topics"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="sidebar-list"
                                >
                                    <div className="list-header">
                                        <h3>Topics</h3>
                                        <button className="btn-add" onClick={() => openModal('topic')}>
                                            <Plus size={14} />
                                            <span>New</span>
                                        </button>
                                    </div>

                                    {filteredTopics.length === 0 ? (
                                        <div className="empty-state">
                                            <BookOpen size={32} strokeWidth={1} />
                                            <p>No topics found</p>
                                        </div>
                                    ) : (
                                        filteredTopics.map((topic) => (
                                            <motion.div
                                                key={topic.id}
                                                className={`sidebar-item topic-item ${simulation.visitedTopicIds.includes(topic.id) ? 'sim-visited' : ''}`}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ x: 4 }}
                                            >
                                                <div className="item-color-bar topic-bar" />
                                                <div className="item-content">
                                                    <div className="item-name">{topic.name}</div>
                                                    <div className="item-details">
                                                        {topic.partitions} partitions
                                                        {topic.description && ` · ${topic.description}`}
                                                    </div>
                                                    {topic.eventIds && topic.eventIds.length > 0 && (
                                                        <div className="item-tags">
                                                            {topic.eventIds.map(eid => {
                                                                const ev = (events || []).find(e => e.id === eid);
                                                                return ev ? (
                                                                    <span key={eid} className="item-tag event-tag">
                                                                        {ev.name}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="item-actions">
                                                    <button
                                                        className="btn-icon btn-simulate"
                                                        onClick={() => handleSimulate(topic.id)}
                                                        title="Simulate event"
                                                        disabled={simulation.active}
                                                    >
                                                        <Play size={12} />
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => openModal('topic', topic)}
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={() => {
                                                            if (confirm(`Delete topic "${topic.name}"?`)) {
                                                                deleteTopic(topic.id);
                                                            }
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </motion.div>
                            )}

                            {sidebarTab === 'jobs' && (
                                <motion.div
                                    key="jobs"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="sidebar-list"
                                >
                                    <div className="list-header">
                                        <h3>Flink Jobs</h3>
                                        <button className="btn-add" onClick={() => openModal('job')}>
                                            <Plus size={14} />
                                            <span>New</span>
                                        </button>
                                    </div>

                                    {filteredJobs.length === 0 ? (
                                        <div className="empty-state">
                                            <Zap size={32} strokeWidth={1} />
                                            <p>No jobs found</p>
                                        </div>
                                    ) : (
                                        filteredJobs.map((job) => (
                                            <motion.div
                                                key={job.id}
                                                className={`sidebar-item job-item ${simulation.visitedJobIds.includes(job.id) ? 'sim-visited' : ''}`}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ x: 4 }}
                                            >
                                                <div className="item-color-bar job-bar" />
                                                <div className="item-content">
                                                    <div className="item-name">{job.name}</div>
                                                    <div className="item-details">
                                                        {job.sourceTopics.length} in · {job.sinkTopics.length} out
                                                    </div>
                                                </div>
                                                <div className="item-actions">
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => openModal('job', job)}
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={() => {
                                                            if (confirm(`Delete job "${job.name}"?`)) {
                                                                deleteFlinkJob(job.id);
                                                            }
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </motion.div>
                            )}

                            {sidebarTab === 'flows' && (
                                <motion.div
                                    key="flows"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="sidebar-list"
                                >
                                    <div className="list-header">
                                        <h3>Data Flows</h3>
                                        <button className="btn-add" onClick={() => openModal('flow')}>
                                            <Plus size={14} />
                                            <span>New</span>
                                        </button>
                                    </div>

                                    {filteredFlows.length === 0 ? (
                                        <div className="empty-state">
                                            <GitBranch size={32} strokeWidth={1} />
                                            <p>No flows found</p>
                                        </div>
                                    ) : (
                                        filteredFlows.map((flow) => (
                                            <motion.div
                                                key={flow.id}
                                                className={`sidebar-item flow-item ${activeFlowId === flow.id ? 'active' : ''}`}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ x: 4 }}
                                                onClick={() => setActiveFlow(activeFlowId === flow.id ? null : flow.id)}
                                            >
                                                <div className="item-color-bar flow-bar" style={{ background: flow.color }} />
                                                <div className="item-content">
                                                    <div className="item-name">{flow.name}</div>
                                                    <div className="item-details">
                                                        {flow.jobIds.length} jobs
                                                    </div>
                                                </div>
                                                <div className="item-actions">
                                                    <button
                                                        className="btn-icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openModal('flow', flow);
                                                        }}
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Delete flow "${flow.name}"?`)) {
                                                                deleteFlow(flow.id);
                                                            }
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </motion.div>
                            )}

                            {sidebarTab === 'events' && (
                                <motion.div
                                    key="events"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="sidebar-list"
                                >
                                    <div className="list-header">
                                        <h3>Event Types</h3>
                                        <button
                                            className="btn-add"
                                            onClick={() => openModal('event')}
                                        >
                                            <Plus size={14} />
                                            <span>New</span>
                                        </button>
                                    </div>

                                    {filteredEvents.length === 0 ? (
                                        <div className="empty-state">
                                            <Radio size={32} strokeWidth={1} />
                                            <p>No events yet</p>
                                            <span>Define event schemas to tag your topics</span>
                                        </div>
                                    ) : (
                                        filteredEvents.map((event) => (
                                            <motion.div
                                                key={event.id}
                                                className="sidebar-item event-item"
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ x: 4 }}
                                            >
                                                <div className="item-color-bar event-bar" />
                                                <div className="item-content">
                                                    <div className="item-name">{event.name}</div>
                                                    <div className="item-details">
                                                        {event.description || 'No description'}
                                                    </div>
                                                </div>
                                                <div className="item-actions">
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => openModal('event', event)}
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={() => {
                                                            if (confirm(`Delete event "${event.name}"?`)) {
                                                                deleteEvent(event.id);
                                                            }
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </>
            ) : (
                <div className="no-project-state">
                    <FolderOpen size={32} className="no-project-icon" />
                    <h2>No active project</h2>
                    <p>Select a project from the dropdown or create a new one to start designing.</p>
                    <button className="btn-create-project" onClick={() => openModal('project')}>
                        <Plus size={14} />
                        <span>Create Project</span>
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
