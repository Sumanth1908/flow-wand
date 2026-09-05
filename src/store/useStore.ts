/**
 * store/useStore.ts
 * Zustand store using TypeScript.
 */
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { buildSimulationActions, INITIAL_SIM } from '../hooks/useSimulation';
import { mergePayloadWithEventSchema } from '../lib/eventSchema';
import { buildProjectActions, projectSnapshot } from './projectActions';
import { ProjectData, emptyProjectData } from '../domain/project';
import { validateProjectData } from '../domain/validation';
import { StoreState, Project, EdgeStyle, EdgeShape, LayoutDirection, EdgePathStyle } from '../types';
import { DEMO_DATA } from '../lib/demoData';

const useStore = create<StoreState>((set, get) => {
    const generatorDeps = { generateEventPayload: mergePayloadWithEventSchema };
    const simActions = buildSimulationActions(get, set, generatorDeps);

    let _toastTimer: ReturnType<typeof setTimeout> | null = null;
    const showToast = (message: string) => {
        if (_toastTimer) clearTimeout(_toastTimer);
        set({ toastMessage: message });
        _toastTimer = setTimeout(() => set({ toastMessage: null }), 3000);
    };

    const attempt = <T,>(operation: () => T): T | null => {
        try { return operation(); }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            set({ operationError: message });
            showToast(message);
            return null;
        }
    };
    const commit = (data: ProjectData): boolean => {
        const state = get(), project = state.projects.find(p => p.id === state.activeProjectId);
        if (!project) return false;
        return attempt(() => {
            validateProjectData(data);
            const now = new Date().toISOString();
            const projects = storage.saveProjectSnapshot({ ...project, lastSavedAt: now }, data);
            set({ ...data, operationError: null, nodePositions: data.nodePositions ?? {}, edgeRoutings: data.edgeRoutings ?? {}, projects, lastSavedAt: now,
                activeFlowId: data.flows.some(f => f.id === state.activeFlowId) ? state.activeFlowId : null });
            return true;
        }) ?? false;
    };
    const projectActions = buildProjectActions(get, commit);
    const savePrefs = (patch: Partial<ReturnType<typeof storage.getPrefs>>) =>
        attempt(() => { storage.savePrefs({ ...storage.getPrefs(), ...patch }); return true; });
    const activate = (project: Project, data: ProjectData) => {
        set({ ...data, activeProjectId: project.id, activeFlowId: null,
            nodePositions: data.nodePositions ?? {}, edgeRoutings: data.edgeRoutings ?? {},
            lastSavedAt: project.lastSavedAt ?? null, selectedNodeId: null,
            focusedConsumerId: null, hoveredEdgeId: null, canvasSearchQuery: '', modalOpen: null, editingItem: null });
        get().clearSimulation();
        savePrefs({ activeProjectId: project.id });
    };

    return {
        // ── Initial state ────────────────────────────────────────
        projects: [],
        activeProjectId: null,
        streams: [],
        consumers: [],
        flows: [],
        events: [],
        activeFlowId: null,
        theme: 'dark',
        simulation: INITIAL_SIM,
        sidebarTab: 'streams',
        leftSidebarOpen: true,
        rightSidebarOpen: false,
        selectedNodeId: null,
        modalOpen: null,
        editingItem: null,
        toastMessage: null,
        recoveryError: null,
        operationError: null,
        dismissRecoveryError: () => set({ recoveryError: null }),
        exportRecoveryData: () => { attempt(() => downloadJson(storage.exportRecoveryData(), `flowwand-recovery-${Date.now()}.json`)); },
        lastSavedAt: null,
        traceMode: false,
        edgeStyle: 'solid',
        edgeShape: 'circle',
        layoutDirection: 'LR',
        edgePathStyle: 'bezier',
        nodePositions: {},
        edgeRoutings: {},
        hoveredEdgeId: null,
        focusedConsumerId: null,
        canvasSearchQuery: '',

        // ── App init ─────────────────────────────────────────────
        init: () => {
            const prefs = storage.getPrefs();
            let projects: Project[] = [];
            try { projects = storage.getProjects(); }
            catch (error) { set({ recoveryError: error instanceof Error ? error.message : String(error) }); showToast('Saved project list is damaged. Download a recovery backup before resetting.'); }
            const theme = (prefs.theme as 'dark' | 'light') || 'dark';
            const edgeStyle = (prefs.edgeStyle as EdgeStyle) || 'solid';
            const edgeShape = (prefs.edgeShape as EdgeShape) || 'circle';
            const layoutDirection = (prefs.layoutDirection as LayoutDirection) || 'LR';
            const edgePathStyle = (prefs.edgePathStyle as EdgePathStyle) || 'bezier';
            document.documentElement.setAttribute('data-theme', theme);
            set({ projects, theme, edgeStyle, edgeShape, layoutDirection, edgePathStyle });
            const targetId = prefs.activeProjectId && projects.some(p => p.id === prefs.activeProjectId)
                ? prefs.activeProjectId : projects[0]?.id;
            if (targetId) get().switchProject(targetId);
        },

        // ── Theme ────────────────────────────────────────────────
        toggleTheme: () => {
            const next = get().theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            savePrefs({ theme: next });
            set({ theme: next });
        },

        // ── Projects ─────────────────────────────────────────────
        createProject: (name, description = '') => attempt(() => {
            const project: Project = { id: uuid(), name, description, createdAt: new Date().toISOString() };
            storage.createProject(project);
            set(s => ({ projects: [...s.projects, project] }));
            activate(project, emptyProjectData());
            return project;
        }),
        updateProject: (id, patch) => { attempt(() => {
            storage.updateProject(id, patch);
            set({ projects: storage.getProjects() });
        }); },
        deleteProject: id => { attempt(() => {
            storage.deleteProject(id);
            const projects = get().projects.filter(p => p.id !== id);
            set({ projects });
            if (get().activeProjectId === id) {
                set({ ...emptyProjectData(), nodePositions: {}, edgeRoutings: {}, activeProjectId: null, activeFlowId: null, lastSavedAt: null,
                    focusedConsumerId: null, selectedNodeId: null, hoveredEdgeId: null });
                get().clearSimulation();
                savePrefs({ activeProjectId: null });
                if (projects[0]) get().switchProject(projects[0].id);
            }
        }); },
        switchProject: projectId => {
            try {
                const project = get().projects.find(p => p.id === projectId);
                if (!project) throw new Error('Project not found');
                activate(project, storage.getProjectData(projectId));
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                set({ recoveryError: message });
                showToast(message);
            }
        },

        // ── Save / Export / Import ───────────────────────────────
        saveProject: () => {
            if (commit(projectSnapshot(get()))) showToast('Saved to browser ✓');
        },
        updateNodePositions: positions => {
            commit({ ...projectSnapshot(get()), nodePositions: { ...get().nodePositions, ...positions } });
        },
        updateEdgeRouting: (edgeId, point) => {
            const next = { ...get().edgeRoutings };
            if (point === null) delete next[edgeId]; else next[edgeId] = point;
            commit({ ...projectSnapshot(get()), edgeRoutings: next });
        },

        setHoveredEdge: (id) => set({ hoveredEdgeId: id }),
        setFocusedConsumer: (id) => set({ focusedConsumerId: id }),
        setCanvasSearchQuery: (query) => set({ canvasSearchQuery: query }),

        resetLayout: () => {
            if (commit({ ...projectSnapshot(get()), nodePositions: {}, edgeRoutings: {} })) showToast('Layout reset to default ✓');
        },
        exportProject: () => { attempt(() => {
            const id = get().activeProjectId;
            if (!id) return;
            const exported = storage.exportProject(id, projectSnapshot(get()));
            if (!exported.project) throw new Error('Export failed: Project not found');
            downloadJson(exported, `flowwand-${_slug(exported.project.name)}-${Date.now()}.json`);
            showToast('Project exported as JSON');
        }); },
        importProject: async file => {
            try {
                const project = storage.importProject(JSON.parse(await file.text()));
                set({ projects: storage.getProjects() });
                activate(project, storage.getProjectData(project.id));
                showToast(`Imported "${project.name}" ✓`);
                return project;
            } catch (error) {
                showToast(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        },
        ...projectActions,

        // ── Simulation ────────────────────────────────────────────
        ...simActions,

        // ── UI ───────────────────────────────────────────────────
        showToast,
        setSidebarTab: (tab) => set({ sidebarTab: tab }),
        setActiveFlow: (id) => set({ activeFlowId: id }),
        setLeftSidebar: (open) => set({ leftSidebarOpen: open }),
        setRightSidebar: (open) => set({ rightSidebarOpen: open }),
        openModal: (type, item = null) => set({ modalOpen: type, editingItem: item, operationError: null }),
        closeModal: () => set({ modalOpen: null, editingItem: null }),
        setSelectedNode: (id) => set({ selectedNodeId: id }),
        setTraceMode: (enabled) => set({ traceMode: enabled }),
        setEdgeStyle: (style) => {
            savePrefs({ edgeStyle: style });
            set({ edgeStyle: style });
        },
        setEdgeShape: (shape) => {
            savePrefs({ edgeShape: shape });
            set({ edgeShape: shape });
        },
        setLayoutDirection: (layout) => {
            if (get().activeProjectId && !commit({ ...projectSnapshot(get()), nodePositions: {}, edgeRoutings: {} })) return;
            savePrefs({ layoutDirection: layout });
            set({ layoutDirection: layout });
        },
        setEdgePathStyle: (style) => {
            savePrefs({ edgePathStyle: style });
            set({ edgePathStyle: style });
        },

        loadDemo: () => { attempt(() => {
            const project: Project = { id: uuid(), name: 'E-Commerce Demo', description: 'Sample event processing pipeline', createdAt: new Date().toISOString() };
            const data = validateProjectData(DEMO_DATA);
            const projects = storage.saveProjectSnapshot(project, data);
            set({ projects });
            activate(project, data);
            showToast('Demo project loaded 🚀');
        }); },
        resetApp: () => { attempt(() => {
            storage.clearAppData();
            set({ ...emptyProjectData(), projects: [], activeProjectId: null, activeFlowId: null,
                lastSavedAt: null, nodePositions: {}, edgeRoutings: {}, focusedConsumerId: null,
                hoveredEdgeId: null, selectedNodeId: null, canvasSearchQuery: '', recoveryError: null });
            get().clearSimulation();
            showToast('Application reset to fresh state 🧹');
        }); },
    };
});

const _slug = (str: string) => str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
export const downloadJson = (data: unknown, filename: string) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
};

export default useStore;
