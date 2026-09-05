import React, { Suspense, lazy } from 'react';
import { X, BookOpen, Zap, GitBranch, FolderOpen, Radio, TriangleAlert, Settings2, Send, Camera } from 'lucide-react';
import useStore from '../../store/useStore';
import { Dialog, DialogTitle, DialogContent, IconButton, Stack, Typography, Box, CircularProgress, Alert } from '@mui/material';

const StreamForm = lazy(() => import('./StreamForm'));
const ConsumerForm = lazy(() => import('./ConsumerForm'));
const FlowForm = lazy(() => import('./FlowForm'));
const ProjectForm = lazy(() => import('./ProjectForm'));
const EventForm = lazy(() => import('./EventForm'));
const ConfirmForm = lazy(() => import('./ConfirmForm'));
const NodeDetailsModal = lazy(() => import('./NodeDetailsModal'));
const SettingsModal = lazy(() => import('./SettingsModal'));
const EventDispatcher = lazy(() => import('../simulation/EventDispatcher'));
const SnapshotPanel = lazy(() => import('../canvas/SnapshotPanel'));

const ICON_MAP: Record<string, any> = {
    stream: BookOpen, consumer: Zap, flow: GitBranch, project: FolderOpen,
    event: Radio, confirm: TriangleAlert, settings: Settings2,
    fireEvent: Send, snapshot: Camera
};
const TITLE_MAP = (editing: boolean): Record<string, string> => ({
    stream: editing ? 'Edit Stream' : 'New Event Stream',
    consumer: editing ? 'Edit Consumer' : 'New Consumer',
    flow: editing ? 'Edit Flow' : 'New Flow',
    project: 'New Project',
    event: editing ? 'Edit Event' : 'New Event Type',
    settings: 'Canvas Settings',
    fireEvent: 'Fire Manual Event',
    snapshot: 'Canvas Snapshot',
});

const Modal: React.FC = () => {
    const modalOpen = useStore(s => s.modalOpen);
    const editingItem = useStore(s => s.editingItem);
    const closeModal = useStore(s => s.closeModal);
    const operationError = useStore(s => s.operationError);

    const open = Boolean(modalOpen);

    if (!modalOpen) return null;

    let Icon = ICON_MAP[modalOpen];
    let color = '#6366f1';
    if (modalOpen === 'fireEvent') color = '#10b981';
    if (modalOpen === 'snapshot') color = '#8b5cf6';
    if (modalOpen === 'settings') color = '#6366f1';

    let title = modalOpen === 'confirm' ? (editingItem?.title || 'Confirm') : TITLE_MAP(!!editingItem)[modalOpen];

    if (modalOpen === 'nodeDetails' && editingItem) {
        Icon = ICON_MAP[editingItem.type] || BookOpen;
        color = editingItem.type === 'stream' ? '#6366f1' : '#f59e0b';
        title = editingItem.type === 'stream' ? 'Stream Details' : 'Consumer Details';
    }

    return (
        <Dialog open={open} onClose={closeModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', pb: 2, pt: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color, display: 'flex' }}>
                        {Icon && <Icon size={24} />}
                    </Box>
                    <Typography variant="h6" fontWeight="bold">{title}</Typography>
                </Stack>
                <IconButton onClick={closeModal} size="small" aria-label="Close dialog">
                    <X size={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, pt: 3 }}>
                <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>}>
                <Box sx={{ mt: 1 }}>
                    {operationError && <Alert severity="error" sx={{ mb: 2 }}>{operationError}</Alert>}
                    {modalOpen === 'stream' && <StreamForm color={color} />}
                    {modalOpen === 'consumer' && <ConsumerForm color={color} />}
                    {modalOpen === 'flow' && <FlowForm color={color} />}
                    {modalOpen === 'project' && <ProjectForm color={color} />}
                    {modalOpen === 'event' && <EventForm color={color} />}
                    {modalOpen === 'confirm' && <ConfirmForm color={color} />}
                    {modalOpen === 'nodeDetails' && <NodeDetailsModal color={color} />}
                    {modalOpen === 'settings' && <SettingsModal />}
                    {modalOpen === 'fireEvent' && <EventDispatcher onClose={closeModal} />}
                    {modalOpen === 'snapshot' && <SnapshotPanel onClose={closeModal} />}
                </Box>
                </Suspense>
            </DialogContent>
        </Dialog>
    );
};

export default Modal;
