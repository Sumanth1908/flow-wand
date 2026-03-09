import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import { APP_CONFIG } from '../lib/config';
import {
    BookOpen, Zap, GitBranch, Plus, Trash, Pencil, Play, ChevronDown, Search, Sun, Moon, Download, Upload, FolderOpen, Save, Radio, PanelLeftClose, PanelLeftOpen, Sparkles, Skull
} from 'lucide-react';

import {
    Box, IconButton, Typography, Button, Menu, MenuItem, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Tooltip, TextField, InputAdornment, Divider, Paper, Stack,
    ListSubheader
} from '@mui/material';

interface TabItem {
    id: 'streams' | 'consumers' | 'flows' | 'events';
    label: string;
    icon: any;
    color: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    actualColorHex: string;
}

const tabs: TabItem[] = [
    { id: 'streams', label: 'Streams', icon: BookOpen, color: 'primary', actualColorHex: '#6366f1' },
    { id: 'consumers', label: 'Consumers', icon: Zap, color: 'secondary', actualColorHex: '#f59e0b' },
    { id: 'flows', label: 'Flows', icon: GitBranch, color: 'success', actualColorHex: '#10b981' },
    { id: 'events', label: 'Events', icon: Radio, color: 'error', actualColorHex: '#ec4899' },
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

const MotionBox = motion.create(Box);

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
    const simActive = useStore(s => s.simulation.active);
    const simVisitedStreamIds = useStore(s => s.simulation.visitedStreamIds);
    const simVisitedConsumerIds = useStore(s => s.simulation.visitedConsumerIds);
    const projects = useStore(s => s.projects);
    const activeProjectId = useStore(s => s.activeProjectId);
    const switchProject = useStore(s => s.switchProject);
    const deleteProject = useStore(s => s.deleteProject);
    const storeTheme = useStore(s => s.theme);
    const toggleTheme = useStore(s => s.toggleTheme);
    const saveProject = useStore(s => s.saveProject);
    const exportProject = useStore(s => s.exportProject);
    const importProject = useStore(s => s.importProject);
    const lastSavedAt = useStore(s => s.lastSavedAt);
    const loadDemo = useStore(s => s.loadDemo);
    const resetApp = useStore(s => s.resetApp);

    const [searchQuery, setSearchQuery] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeProject = projects.find((p) => p.id === activeProjectId);

    const filteredStreams = streams.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const normalStreams = filteredStreams.filter(t => !t.isDLQ);
    const dlqStreams = filteredStreams.filter(t => t.isDLQ);
    const filteredConsumers = consumers.filter((j) => j.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredFlows = flows.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredEvents = (events || []).filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const [dlqSectionOpen, setDlqSectionOpen] = React.useState(false);

    const handleProjectMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleSimulate = (streamId: string) => {
        openModal('fireEvent', streamId);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) importProject(file);
        e.target.value = '';
    };

    if (!leftSidebarOpen) {
        return (
            <Paper elevation={1} sx={{ width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, height: '100%', borderRadius: 2 }}>
                <IconButton onClick={() => setLeftSidebar(true)} sx={{ mb: 4 }}>
                    <PanelLeftOpen size={20} />
                </IconButton>
                <Stack spacing={2} sx={{ flex: 1 }}>
                    {tabs.map(tab => (
                        <Tooltip key={tab.id} title={tab.label} placement="right">
                            <IconButton onClick={() => { setLeftSidebar(true); setSidebarTab(tab.id); }}
                                sx={{ color: sidebarTab === tab.id ? tab.actualColorHex : 'text.secondary' }}>
                                <tab.icon size={20} />
                            </IconButton>
                        </Tooltip>
                    ))}
                    <Tooltip title="Toggle Theme" placement="right">
                        <IconButton onClick={toggleTheme}>
                            {storeTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Paper>
        );
    }

    return (
        <Paper elevation={1} sx={{ width: 320, display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 2, overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.default', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="FlowWand" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold" lineHeight={1}>{APP_CONFIG.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 10 }}>{APP_CONFIG.tagline}</Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={toggleTheme}>
                        {storeTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </IconButton>
                    <IconButton size="small" onClick={() => setLeftSidebar(false)}>
                        <PanelLeftClose size={16} />
                    </IconButton>
                </Stack>
            </Box>

            {/* Project Selector */}
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button fullWidth variant="outlined" color="inherit" onClick={handleProjectMenuClick} endIcon={<ChevronDown size={14} />}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 0.5, borderColor: 'divider', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' } }}>
                    <Box sx={{ p: 0.6, borderRadius: 1.5, border: 1, borderColor: 'divider', mr: 1.2, display: 'flex', bgcolor: 'background.default', color: 'text.secondary' }}>
                        <FolderOpen size={14} />
                    </Box>
                    <Typography noWrap variant="body2" fontWeight="bold" sx={{ flex: 1, textAlign: 'left' }}>
                        {activeProject?.name || 'Select Project'}
                    </Typography>
                </Button>
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Save project"><IconButton size="small" color="success" onClick={saveProject}><Save size={16} /></IconButton></Tooltip>
                    <Tooltip title="Export JSON"><IconButton size="small" onClick={exportProject}><Download size={16} /></IconButton></Tooltip>
                    <Tooltip title="Import JSON"><IconButton size="small" onClick={() => fileInputRef.current?.click()}><Upload size={16} /></IconButton></Tooltip>
                    <input type="file" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} accept=".json" />
                </Stack>
            </Box>

            {lastSavedAt && (
                <Box sx={{ px: 2, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">Last saved: {formatTimestamp(lastSavedAt)}</Typography>
                </Box>
            )}

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 300 } }}>
                {projects.map((p) => (
                    <MenuItem key={p.id} selected={p.id === activeProjectId} onClick={() => { switchProject(p.id); setAnchorEl(null); }} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ flex: 1 }} noWrap>{p.name}</Typography>
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); openModal('confirm', { title: 'Delete Project', message: `Delete project "${p.name}"?`, confirmLabel: 'Delete', onConfirm: () => deleteProject(p.id) }); }}>
                            <Trash size={14} />
                        </IconButton>
                    </MenuItem>
                ))}
                <Divider />
                <MenuItem onClick={() => { openModal('project'); setAnchorEl(null); }}>
                    <ListItemIcon><Plus size={16} /></ListItemIcon>
                    <Typography variant="body2">Create New Project</Typography>
                </MenuItem>
                <MenuItem onClick={() => { loadDemo(); setAnchorEl(null); }} sx={{ color: 'warning.main' }}>
                    <ListItemIcon><Sparkles size={16} color="inherit" /></ListItemIcon>
                    <Typography variant="body2">Load Demo</Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { setAnchorEl(null); openModal('confirm', { title: 'Reset Data', message: 'Delete all apps?', confirmLabel: 'Reset', onConfirm: resetApp }); }} sx={{ color: 'error.main' }}>
                    <ListItemIcon><Trash size={16} color="inherit" /></ListItemIcon>
                    <Typography variant="body2">Reset App Data</Typography>
                </MenuItem>
            </Menu>

            {activeProjectId ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{ px: 1.5, py: 1 }}>
                        <TextField fullWidth size="small" placeholder={`Search ${sidebarTab}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={14} /></InputAdornment>, sx: { fontSize: 12, height: 36 } }} />
                    </Box>
                    <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
                        {tabs.map((tab) => {
                            const count = tab.id === 'streams' ? streams.length : tab.id === 'consumers' ? consumers.length : tab.id === 'events' ? events.length : flows.length;
                            const isActive = sidebarTab === tab.id;
                            return (
                                <Button
                                    key={tab.id}
                                    onClick={() => setSidebarTab(tab.id)}
                                    sx={{
                                        flexShrink: 0, minWidth: 80, px: 1.5, py: 1.5,
                                        textTransform: 'none',
                                        color: isActive ? `${tab.color}.main` : 'text.secondary',
                                        borderBottom: 2,
                                        borderColor: isActive ? `${tab.color}.main` : 'transparent',
                                        borderRadius: 0,
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="center" sx={{ width: '100%', px: 0.5 }}>
                                        <tab.icon size={14} style={{ flexShrink: 0 }} />
                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                                            <Typography
                                                variant="caption"
                                                fontWeight="800"
                                                sx={{
                                                    fontSize: 10,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {tab.label}
                                            </Typography>
                                            <Box sx={{
                                                bgcolor: isActive ? `${tab.color}.main` : 'rgba(0,0,0,0.06)',
                                                color: isActive ? 'white' : 'text.secondary',
                                                px: 0.6,
                                                py: 0.1,
                                                borderRadius: 0.8,
                                                fontSize: 9,
                                                fontWeight: 900,
                                                flexShrink: 0
                                            }}>
                                                {count}
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </Button>
                            );
                        })}
                    </Box>

                    <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'background.paper' }}>
                        <AnimatePresence mode="wait">
                            <MotionBox key={sidebarTab} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>

                                {sidebarTab === 'streams' && (
                                    <List disablePadding sx={{ px: 1.5, py: 1 }}>
                                        <ListSubheader
                                            sx={{
                                                bgcolor: 'background.paper',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                px: 1, py: 1.5, mb: 1,
                                                color: 'text.primary', fontWeight: '900', fontSize: '0.65rem', letterSpacing: 1.5,
                                                zIndex: 10,
                                                lineHeight: 1
                                            }}
                                        >
                                            EVENT STREAMS
                                            <IconButton size="small" onClick={() => openModal('stream')} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, width: 22, height: 22 }}>
                                                <Plus size={14} />
                                            </IconButton>
                                        </ListSubheader>

                                        {/* Normal Streams */}
                                        {normalStreams.map((s) => (
                                            <ListItem key={s.id} disablePadding sx={{ mb: 1 }}>
                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        width: '100%', p: 1.2, borderRadius: 2, border: 1,
                                                        borderColor: simVisitedStreamIds.includes(s.id) ? 'primary.main' : 'divider',
                                                        bgcolor: 'background.default',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
                                                        '&:hover .actions': { opacity: 1, transform: 'translateX(0)' }
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'primary.main', display: 'flex' }}>
                                                            <BookOpen size={14} />
                                                        </Box>
                                                        <ListItemText
                                                            primary={<Typography variant="body2" fontWeight="700" noWrap fontSize={13}>{s.name}</Typography>}
                                                            secondary={<Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.6, fontSize: 11 }}>{s.description || s.type}</Typography>}
                                                        />
                                                        <Stack direction="row" spacing={0.5} className="actions" sx={{ opacity: { xs: 1, md: 0 }, transform: { md: 'translateX(5px)' }, transition: '0.2s', flexShrink: 0 }}>
                                                            <IconButton size="small" color="primary" onClick={() => handleSimulate(s.id)} disabled={simActive} sx={{ width: 24, height: 24 }}><Play size={12} /></IconButton>
                                                            <IconButton size="small" onClick={() => openModal('stream', s)} sx={{ width: 24, height: 24 }}><Pencil size={12} /></IconButton>
                                                            <IconButton size="small" color="error" onClick={() => openModal('confirm', { title: 'Delete Stream', message: 'Delete stream?', onConfirm: () => deleteStream(s.id) })} sx={{ width: 24, height: 24 }}><Trash size={12} /></IconButton>
                                                        </Stack>
                                                    </Stack>
                                                </Paper>
                                            </ListItem>
                                        ))}

                                        {/* DLQ Sub-section */}
                                        {dlqStreams.length > 0 && (
                                            <>
                                                <Box
                                                    onClick={() => setDlqSectionOpen(o => !o)}
                                                    sx={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        px: 1, py: 1, mb: 1, mt: 1,
                                                        borderRadius: 1.5,
                                                        cursor: 'pointer',
                                                        userSelect: 'none',
                                                        bgcolor: 'rgba(239,68,68,0.06)',
                                                        border: '1px solid rgba(239,68,68,0.18)',
                                                        transition: 'all 0.15s',
                                                        '&:hover': { bgcolor: 'rgba(239,68,68,0.10)' },
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Skull size={12} color="#ef4444" />
                                                        <Typography variant="caption" fontWeight="900" sx={{ fontSize: '0.6rem', letterSpacing: 1.5, color: 'error.main' }}>
                                                            DEAD LETTER QUEUES
                                                        </Typography>
                                                        <Box sx={{ px: 0.6, py: 0.1, borderRadius: 0.8, fontSize: 9, fontWeight: 900, bgcolor: 'error.main', color: 'white' }}>
                                                            {dlqStreams.length}
                                                        </Box>
                                                    </Stack>
                                                    <ChevronDown size={12} color="#ef4444"
                                                        style={{ transform: dlqSectionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                                                    />
                                                </Box>

                                                {dlqSectionOpen && dlqStreams.map((s) => (
                                                    <ListItem key={s.id} disablePadding sx={{ mb: 1 }}>
                                                        <Paper
                                                            elevation={0}
                                                            sx={{
                                                                width: '100%', p: 1.2, borderRadius: 2, border: 1,
                                                                borderColor: 'rgba(239,68,68,0.25)',
                                                                bgcolor: 'background.default',
                                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                '&:hover': { borderColor: 'error.main', bgcolor: 'rgba(239,68,68,0.04)', transform: 'translateY(-1px)' },
                                                                '&:hover .actions': { opacity: 1, transform: 'translateX(0)' }
                                                            }}
                                                        >
                                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                                <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(239,68,68,0.1)', color: 'error.main', display: 'flex' }}>
                                                                    <Skull size={14} />
                                                                </Box>
                                                                <ListItemText
                                                                    primary={<Typography variant="body2" fontWeight="700" noWrap fontSize={13} color="error.main">{s.name}</Typography>}
                                                                    secondary={<Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.6, fontSize: 11 }}>{s.description || s.type}</Typography>}
                                                                />
                                                                <Stack direction="row" spacing={0.5} className="actions" sx={{ opacity: { xs: 1, md: 0 }, transform: { md: 'translateX(5px)' }, transition: '0.2s', flexShrink: 0 }}>
                                                                    <IconButton size="small" onClick={() => openModal('stream', s)} sx={{ width: 24, height: 24 }}><Pencil size={12} /></IconButton>
                                                                    <IconButton size="small" color="error" onClick={() => openModal('confirm', { title: 'Delete DLQ', message: `Delete DLQ stream "${s.name}"?`, onConfirm: () => deleteStream(s.id) })} sx={{ width: 24, height: 24 }}><Trash size={12} /></IconButton>
                                                                </Stack>
                                                            </Stack>
                                                        </Paper>
                                                    </ListItem>
                                                ))}
                                            </>
                                        )}
                                    </List>
                                )}

                                {sidebarTab === 'consumers' && (
                                    <List disablePadding sx={{ px: 1.5, py: 1 }}>
                                        <ListSubheader
                                            sx={{
                                                bgcolor: 'background.paper',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                px: 1, py: 1.5, mb: 1,
                                                color: 'text.primary', fontWeight: '900', fontSize: '0.65rem', letterSpacing: 1.5,
                                                zIndex: 10,
                                                lineHeight: 1
                                            }}
                                        >
                                            CONSUMERS
                                            <IconButton size="small" onClick={() => openModal('consumer')} sx={{ bgcolor: 'secondary.main', color: 'white', '&:hover': { bgcolor: 'secondary.dark' }, width: 22, height: 22 }}>
                                                <Plus size={14} />
                                            </IconButton>
                                        </ListSubheader>
                                        {filteredConsumers.map((c) => (
                                            <ListItem key={c.id} disablePadding sx={{ mb: 1 }}>
                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        width: '100%', p: 1.2, borderRadius: 2, border: 1,
                                                        borderColor: simVisitedConsumerIds.includes(c.id) ? 'secondary.main' : 'divider',
                                                        bgcolor: 'background.default',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        '&:hover': { borderColor: 'secondary.main', bgcolor: 'action.hover', transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
                                                        '&:hover .actions': { opacity: 1, transform: 'translateX(0)' }
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(245, 158, 11, 0.1)', color: 'secondary.main', display: 'flex' }}>
                                                            <Zap size={14} />
                                                        </Box>
                                                        <ListItemText
                                                            primary={<Typography variant="body2" fontWeight="700" noWrap fontSize={13}>{c.name}</Typography>}
                                                            secondary={<Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.6, fontSize: 11 }}>{(c.sources || []).length} in → {(c.sinks || []).length} out</Typography>}
                                                        />
                                                        <Stack direction="row" spacing={0.5} className="actions" sx={{ opacity: { xs: 1, md: 0 }, transform: { md: 'translateX(5px)' }, transition: '0.2s', flexShrink: 0 }}>
                                                            <IconButton size="small" onClick={() => openModal('consumer', c)} sx={{ width: 24, height: 24 }}><Pencil size={12} /></IconButton>
                                                            <IconButton size="small" color="error" onClick={() => openModal('confirm', { title: 'Delete Consumer', message: 'Delete consumer?', onConfirm: () => deleteConsumer(c.id) })} sx={{ width: 24, height: 24 }}><Trash size={12} /></IconButton>
                                                        </Stack>
                                                    </Stack>
                                                </Paper>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}

                                {sidebarTab === 'flows' && (
                                    <List disablePadding sx={{ px: 1.5, py: 1 }}>
                                        <ListSubheader
                                            sx={{
                                                bgcolor: 'background.paper',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                px: 1, py: 1.5, mb: 1,
                                                color: 'text.primary', fontWeight: '900', fontSize: '0.65rem', letterSpacing: 1.5,
                                                zIndex: 10,
                                                lineHeight: 1
                                            }}
                                        >
                                            DATA FLOWS
                                            <IconButton size="small" onClick={() => openModal('flow')} sx={{ bgcolor: 'success.main', color: 'white', '&:hover': { bgcolor: 'success.dark' }, width: 22, height: 22 }}>
                                                <Plus size={14} />
                                            </IconButton>
                                        </ListSubheader>
                                        {filteredFlows.map((f) => (
                                            <ListItem key={f.id} disablePadding sx={{ mb: 1.5 }}>
                                                <ListItemButton
                                                    selected={activeFlowId === f.id}
                                                    onClick={() => setActiveFlow(activeFlowId === f.id ? null : f.id)}
                                                    sx={{
                                                        p: 1.2, borderRadius: 2, border: 1,
                                                        borderColor: activeFlowId === f.id ? 'success.main' : 'divider',
                                                        bgcolor: 'background.default',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        '&.Mui-selected': { bgcolor: 'rgba(16, 185, 129, 0.08)', borderColor: 'success.main', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.12)' } },
                                                        '&:hover': { borderColor: 'success.main', bgcolor: 'action.hover' },
                                                        '&:hover .actions': { opacity: 1, transform: 'translateX(0)' }
                                                    }}
                                                >
                                                    <Box sx={{ width: 4, height: 32, bgcolor: 'primary.main', borderRadius: 2, mr: 1.5, flexShrink: 0, opacity: 0.5 }} />
                                                    <ListItemText
                                                        primary={<Typography variant="body2" fontWeight="700" noWrap fontSize={13}>{f.name}</Typography>}
                                                    />
                                                    <Stack direction="row" spacing={0.5} className="actions" sx={{ opacity: { xs: 1, md: 0 }, transform: { md: 'translateX(10px)' }, transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0 }}>
                                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); openModal('flow', f); }} sx={{ bgcolor: 'action.hover' }}><Pencil size={14} /></IconButton>
                                                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); openModal('confirm', { title: 'Delete', message: 'Delete flow?', confirmLabel: 'Delete', onConfirm: () => deleteFlow(f.id) }); }}><Trash size={14} /></IconButton>
                                                    </Stack>
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}

                                {sidebarTab === 'events' && (
                                    <List disablePadding sx={{ px: 1.5, py: 1 }}>
                                        <ListSubheader
                                            sx={{
                                                bgcolor: 'background.paper',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                px: 1, py: 1.5, mb: 1,
                                                color: 'text.primary', fontWeight: '900', fontSize: '0.65rem', letterSpacing: 1.5,
                                                zIndex: 10,
                                                lineHeight: 1
                                            }}
                                        >
                                            EVENT TYPES
                                            <IconButton size="small" onClick={() => openModal('event')} sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' }, width: 22, height: 22 }}>
                                                <Plus size={14} />
                                            </IconButton>
                                        </ListSubheader>
                                        {filteredEvents.map((e) => (
                                            <ListItem key={e.id} disablePadding sx={{ mb: 1.5 }}>
                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        width: '100%', p: 1.2, borderRadius: 2, border: 1,
                                                        borderColor: 'divider',
                                                        bgcolor: 'background.default',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        '&:hover': { borderColor: 'error.main', bgcolor: 'action.hover', transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
                                                        '&:hover .actions': { opacity: 1, transform: 'translateX(0)' }
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                                        <Box sx={{ width: 4, height: 32, bgcolor: 'error.main', borderRadius: 2, flexShrink: 0 }} />
                                                        <ListItemText
                                                            primary={<Typography variant="body2" fontWeight="700" noWrap fontSize={13}>{e.name}</Typography>}
                                                            secondary={<Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.6 }}>{e.description || 'No description'}</Typography>}
                                                        />
                                                        <Stack direction="row" spacing={0.5} className="actions" sx={{ opacity: { xs: 1, md: 0 }, transform: { md: 'translateX(10px)' }, transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0 }}>
                                                            <IconButton size="small" onClick={() => openModal('event', e)} sx={{ bgcolor: 'action.hover' }}><Pencil size={14} /></IconButton>
                                                            <IconButton size="small" color="error" onClick={() => openModal('confirm', { title: 'Delete Event', message: 'Delete event type?', onConfirm: () => deleteEvent(e.id) })} sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)' }}><Trash size={14} /></IconButton>
                                                        </Stack>
                                                    </Stack>
                                                </Paper>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </MotionBox>
                        </AnimatePresence>
                    </Box>
                </Box>
            ) : (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
                    <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                    <Typography variant="h6" fontWeight="bold">No active project</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>Select a project or create a new one.</Typography>
                    <Button variant="contained" color="primary" onClick={() => openModal('project')} startIcon={<Plus size={16} />}>Create Project</Button>
                </Box>
            )}

            <Box sx={{ mt: 'auto', p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    Made with ❤️ by <a href={APP_CONFIG.author.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{APP_CONFIG.author.shortName}</a>
                </Typography>
            </Box>
        </Paper>
    );
};

export default Sidebar;
