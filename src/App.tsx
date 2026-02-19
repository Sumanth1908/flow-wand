import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/canvas/FlowCanvas';
import SimulationDrawer from './components/simulation/SimulationDrawer';
import Modal from './components/modals/Modal';
import useStore from './store/useStore';
import './index.css';

// ── Toast ──────────────────────────────────────────────────────
const ToastElement: React.FC = () => {
    const msg = useStore(s => s.toastMessage);
    return (
        <AnimatePresence>
            {msg && (
                <motion.div
                    className="toast"
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
        <div className="app">
            <Sidebar />

            <main className="main-area">
                {activeProjectId ? (
                    <FlowCanvas />
                ) : (
                    <div className="no-project-canvas">
                        <div className="no-project-canvas-inner">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                            <h2>Select or Create a Project</h2>
                            <p>Use the sidebar to create a new project or import an existing one to get started.</p>
                        </div>
                    </div>
                )}
            </main>

            {activeProjectId && <SimulationDrawer />}

            <Modal />
            <ToastElement />
        </div>
    );
};

export default App;
