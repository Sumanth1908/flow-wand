import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import { EventStream, EventType } from '../types';
import { APP_CONFIG } from '../lib/config';
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
    Sparkles,
} from 'lucide-react';

interface TabItem {
    id: 'streams' | 'consumers' | 'flows' | 'events';
    label: string;
    icon: any;
    color: string;
}

const tabs: TabItem[] = [
    { id: 'streams', label: 'Streams', icon: BookOpen, color: '#6366f1' },
    { id: 'consumers', label: 'Consumers', icon: Zap, color: '#f59e0b' },
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
    const sidebarTab = useStore(s => s.sidebarTab);
    const setSidebarTab = useStore(s => s.setSidebarTab);
    const leftSidebarOpen = useStore(s => s.leftSidebarOpen);
    const setLeftSidebar = useStore(s => s.setLeftSidebar);
    const streams = useStore(s => s.streams);
    const consumers = useStore(s => s.consumers);
    const flows = useStore(s => s.flows);
    const events = useStore(s => s.events);
    const openModal = useStore(s => s.openModal);
    const deleteStream = useStore(s => s.deleteStream);
    const deleteConsumer = useStore(s => s.deleteConsumer);
    const deleteFlow = useStore(s => s.deleteFlow);
    const deleteEvent = useStore(s => s.deleteEvent);
    const activeFlowId = useStore(s => s.activeFlowId);
    const setActiveFlow = useStore(s => s.setActiveFlow);
    const startSimulation = useStore(s => s.startSimulation);
    const simActive = useStore(s => s.simulation.active);
    const simVisitedStreamIds = useStore(s => s.simulation.visitedStreamIds);
    const simVisitedConsumerIds = useStore(s => s.simulation.visitedConsumerIds);
    const projects = useStore(s => s.projects);
    const activeProjectId = useStore(s => s.activeProjectId);
    const switchProject = useStore(s => s.switchProject);
    const deleteProject = useStore(s => s.deleteProject);
    const theme = useStore(s => s.theme);
    const toggleTheme = useStore(s => s.toggleTheme);
    const saveProject = useStore(s => s.saveProject);
    const exportProject = useStore(s => s.exportProject);
    const importProject = useStore(s => s.importProject);
    const lastSavedAt = useStore(s => s.lastSavedAt);
    const loadDemo = useStore(s => s.loadDemo);

    const [searchQuery, setSearchQuery] = useState('');
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeProject = projects.find((p) => p.id === activeProjectId);

    const filteredStreams = streams.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredConsumers = consumers.filter((j) =>
        j.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredFlows = flows.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredEvents = (events || []).filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSimulate = (streamId: string) => {
        if (!simActive) {
            startSimulation(streamId);
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
                        <div style={{ width: 36, height: 36, borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="FlowWand" style={{ width: '125%', height: '125%', objectFit: 'cover' }} />
                        </div>
                        <div className="logo-text">
                            <h1>{APP_CONFIG.name}</h1>
                            <div className="logo-subtitle">{APP_CONFIG.tagline}</div>
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
                                        openModal('confirm', {
                                            title: 'Delete Project',
                                            message: `Delete project "${p.name}" and all its data?`,
                                            confirmLabel: 'Delete',
                                            onConfirm: () => deleteProject(p.id)
                                        });
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
                        <button className="project-dropdown-new" style={{ color: 'var(--amber)' }} onClick={() => {
                            loadDemo();
                            setProjectDropdownOpen(false);
                        }}>
                            <Sparkles size={14} />
                            <span>Load Demo</span>
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
                                    {tab.id === 'streams'
                                        ? streams.length
                                        : tab.id === 'consumers'
                                            ? consumers.length
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
                            {sidebarTab === 'streams' && (
                                <motion.div
                                    key="streams"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="sidebar-list"
                                >
                                    <div className="list-header">
                                        <h3>Event Streams</h3>
                                        <button className="btn-add" onClick={() => openModal('stream')}>
                                            <Plus size={14} />
                                            <span>New</span>
                                        </button>
                                    </div>

                                    {filteredStreams.length === 0 ? (
                                        <div className="empty-state">
                                            <BookOpen size={32} strokeWidth={1} />
                                            <p>No streams found</p>
                                        </div>
                                    ) : (
                                        filteredStreams.map((stream: EventStream) => (
                                            <motion.div
                                                key={stream.id}
                                                className={`sidebar-item stream-item ${simVisitedStreamIds.includes(stream.id) ? 'sim-visited' : ''}`}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ x: 4 }}
                                            >
                                                <div className="item-color-bar stream-bar" />
                                                <div className="item-content">
                                                    <div className="item-name">
                                                        {stream.name}
                                                    </div>
                                                    <div className="item-details">
                                                        {stream.description && `${stream.description}`}
                                                    </div>
                                                    <div className="item-details">
                                                        <span className="pill" >{stream.type}</span>
                                                    </div>
                                                    {stream.eventIds && stream.eventIds.length > 0 && (
                                                        <div className="item-tags">
                                                            {stream.eventIds.map((eid: string) => {
                                                                const ev = (events as EventType[] || []).find((e: EventType) => e.id === eid);
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
                                                        onClick={() => handleSimulate(stream.id)}
                                                        title="Simulate event"
                                                        disabled={simActive}
                                                    >
                                                        <Play size={12} />
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => openModal('stream', stream)}
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={() => {
                                                            openModal('confirm', {
                                                                title: 'Delete Stream',
                                                                message: `Are you sure you want to delete the stream "${stream.name}"?`,
                                                                confirmLabel: 'Delete',
                                                                onConfirm: () => deleteStream(stream.id)
                                                            });
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

                            {sidebarTab === 'consumers' && (
                                <motion.div
                                    key="consumers"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="sidebar-list"
                                >
                                    <div className="list-header">
                                        <h3>Consumers</h3>
                                        <button className="btn-add" onClick={() => openModal('consumer')}>
                                            <Plus size={14} />
                                            <span>New</span>
                                        </button>
                                    </div>

                                    {filteredConsumers.length === 0 ? (
                                        <div className="empty-state">
                                            <Zap size={32} strokeWidth={1} />
                                            <p>No consumers found</p>
                                        </div>
                                    ) : (
                                        filteredConsumers.map((consumer) => (
                                            <motion.div
                                                key={consumer.id}
                                                className={`sidebar-item consumer-item ${simVisitedConsumerIds.includes(consumer.id) ? 'sim-visited' : ''}`}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ x: 4 }}
                                            >
                                                <div className="item-color-bar consumer-bar" />
                                                <div className="item-content">
                                                    <div className="item-name">{consumer.name}</div>
                                                    <div className="item-details">
                                                        {(consumer.sources || []).length} in · {(consumer.sinks || []).length} out
                                                    </div>
                                                </div>
                                                <div className="item-actions">
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => openModal('consumer', consumer)}
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={() => {
                                                            openModal('confirm', {
                                                                title: 'Delete Consumer',
                                                                message: `Are you sure you want to delete the consumer "${consumer.name}"?`,
                                                                confirmLabel: 'Delete',
                                                                onConfirm: () => deleteConsumer(consumer.id)
                                                            });
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
                                                        {flow.consumerIds.length} consumers
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
                                                            openModal('confirm', {
                                                                title: 'Delete Flow',
                                                                message: `Are you sure you want to delete the flow "${flow.name}"?`,
                                                                confirmLabel: 'Delete',
                                                                onConfirm: () => deleteFlow(flow.id)
                                                            });
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
                                            <span>Define event schemas to tag your streams</span>
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
                                                            openModal('confirm', {
                                                                title: 'Delete Event',
                                                                message: `Are you sure you want to delete the event "${event.name}"?`,
                                                                confirmLabel: 'Delete',
                                                                onConfirm: () => deleteEvent(event.id)
                                                            });
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

            {/* Footer */}
            <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <a href={APP_CONFIG.author.buyMeACoffee} target="_blank" rel="noopener noreferrer">
                    <img
                        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                        alt="Buy Me A Coffee"
                        style={{ height: '36px', width: 'auto' }}
                    />
                </a>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    Made with ❤️ by{' '}
                    <a
                        href={APP_CONFIG.author.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--indigo-light)', textDecoration: 'none' }}
                    >
                        {APP_CONFIG.author.shortName}
                    </a>
                </span>
            </div>
        </aside>
    );
};

export default Sidebar;
