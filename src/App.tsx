import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/canvas/FlowCanvas';
import SimulationDrawer from './components/simulation/SimulationDrawer';
import Modal from './components/modals/Modal';
import useStore from './store/useStore';
import { ReactFlowProvider } from '@xyflow/react';
import './index.css';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createAppTheme } from './theme';

// ── Toast ──────────────────────────────────────────────────────
const ToastElement: React.FC = () => {
    const msg = useStore(s => s.toastMessage);
    return (
        <AnimatePresence>
            {msg && (
                <motion.div
                    style={{
                        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
                        padding: '14px 20px', backgroundColor: 'var(--color-bg-elevated, #172035)',
                        border: '1px solid var(--color-border-default, rgba(148, 163, 184, 0.12))',
                        borderRadius: 8, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        display: 'flex', alignItems: 'center', gap: 12,
                        fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary, #f1f5f9)'
                    }}
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                >
                    {msg}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ── App ────────────────────────────────────────────────────────
const App: React.FC = () => {
    const init = useStore(s => s.init);
    const activeProjectId = useStore(s => s.activeProjectId);
    const saveProject = useStore(s => s.saveProject);
    const themeMode = useStore(s => s.theme) as 'light' | 'dark';

    const muiTheme = useMemo(() => createAppTheme(themeMode), [themeMode]);

    useEffect(() => { init(); }, [init]);

    // Cmd/Ctrl+S → save project
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (activeProjectId) saveProject();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeProjectId, saveProject]);

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <ReactFlowProvider>
                <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', p: 1, gap: 1, bgcolor: 'background.default' }}>
                    <Sidebar />

                    <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
                        {activeProjectId ? (
                            <Box sx={{ flex: 1, width: '100%', height: '100%' }}>
                                <FlowCanvas />
                            </Box>
                        ) : (
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper' }}>
                                <Box sx={{ textAlign: 'center', maxWidth: 380, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.secondary' }}>
                                    <svg style={{ opacity: 0.3, marginBottom: 20 }} width="64" height="64" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                    </svg>
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>Select or Create a Project</Typography>
                                    <Typography variant="body2" color="text.secondary">Use the sidebar to create a new project or import an existing one to get started.</Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>

                    {activeProjectId && <SimulationDrawer />}

                    <Modal />
                    <ToastElement />
                </Box>
            </ReactFlowProvider>
        </ThemeProvider>
    );
};

export default App;
