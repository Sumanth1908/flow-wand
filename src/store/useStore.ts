/**
 * store/useStore.ts
 * Zustand store using TypeScript.
 */
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { buildTopicActions } from '../hooks/useTopics';
import { buildFlinkJobActions } from '../hooks/useFlinkJobs';
import { buildFlowActions } from '../hooks/useFlows';
import { buildEventActions } from '../hooks/useEvents';
import { buildSimulationActions, INITIAL_SIM } from '../hooks/useSimulation';
import { StoreState, Topic, FlinkJob, DataFlow, EventType, Project } from '../types';

const useStore = create<StoreState>((set, get) => {
    const simActions = buildSimulationActions(get, set);

    let _toastTimer: ReturnType<typeof setTimeout> | null = null;
    const showToast = (message: string) => {
        if (_toastTimer) clearTimeout(_toastTimer);
        set({ toastMessage: message });
        _toastTimer = setTimeout(() => set({ toastMessage: null }), 3000);
    };

    const getTopics = () => get().topics;
    const setTopics = (t: Topic[]) => set({ topics: t });
    const getJobs = () => get().flinkJobs;
    const setJobs = (j: FlinkJob[]) => set({ flinkJobs: j });
    const getFlows = () => get().flows;
    const setFlows = (f: DataFlow[]) => set({ flows: f });
    const getEvents = () => get().events;
    const setEvents = (e: EventType[]) => set({ events: e });
    const getProjId = () => get().activeProjectId;

    const topicActions = () => buildTopicActions(getProjId(), getTopics, setTopics, showToast);
    const jobActions = () => buildFlinkJobActions(getProjId(), getJobs, setJobs, getFlows, setFlows);
    const flowActions = () => buildFlowActions(getProjId(), getFlows, setFlows);
    const eventActions = () => buildEventActions(getProjId(), getEvents, setEvents, getTopics, setTopics);

    return {
        // ── Initial state ────────────────────────────────────────
        projects: [],
        activeProjectId: null,
        topics: [],
        flinkJobs: [],
        flows: [],
        events: [],
        activeFlowId: null,
        theme: 'dark',
        simulation: INITIAL_SIM,
        sidebarTab: 'topics',
        leftSidebarOpen: true,
        rightSidebarOpen: false,
        selectedNodeId: null,
        modalOpen: null,
        editingItem: null,
        toastMessage: null,
        lastSavedAt: null,

        // ── App init ─────────────────────────────────────────────
        init: () => {
            const prefs = storage.getPrefs();
            const projects = storage.getProjects();
            const theme = (prefs.theme as 'dark' | 'light') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            set({ projects, theme });
            const targetId = prefs.activeProjectId && projects.some(p => p.id === prefs.activeProjectId)
                ? prefs.activeProjectId : projects[0]?.id;
            if (targetId) get().switchProject(targetId);
        },

        // ── Theme ────────────────────────────────────────────────
        toggleTheme: () => {
            const next = get().theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            storage.savePrefs({ ...storage.getPrefs(), theme: next });
            set({ theme: next });
        },

        // ── Projects ─────────────────────────────────────────────
        createProject: (name, description = '') => {
            const project: Project = { id: uuid(), name, description, createdAt: new Date().toISOString() };
            storage.createProject(project);
            storage.savePrefs({ ...storage.getPrefs(), activeProjectId: project.id });
            set(s => ({
                projects: [...s.projects, project],
                activeProjectId: project.id,
                topics: [], flinkJobs: [], flows: [], events: [],
                activeFlowId: null, lastSavedAt: null,
            }));
            return project;
        },

        updateProject: (id, patch) => {
            storage.updateProject(id, patch);
            set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p) }));
        },

        deleteProject: (id) => {
            storage.deleteProject(id);
            const remaining = get().projects.filter(p => p.id !== id);
            set({ projects: remaining });
            if (get().activeProjectId === id) {
                if (remaining.length > 0) {
                    get().switchProject(remaining[0].id);
                } else {
                    storage.savePrefs({ ...storage.getPrefs(), activeProjectId: null });
                    set({ activeProjectId: null, topics: [], flinkJobs: [], flows: [], events: [], activeFlowId: null });
                }
            }
        },

        switchProject: (projectId) => {
            const data = storage.getProjectData(projectId);
            const project = storage.getProjects().find(p => p.id === projectId);
            storage.savePrefs({ ...storage.getPrefs(), activeProjectId: projectId });
            set({
                activeProjectId: projectId,
                topics: data.topics || [],
                flinkJobs: data.flinkJobs || [],
                flows: data.flows || [],
                events: data.events || [],
                activeFlowId: null,
                lastSavedAt: project?.lastSavedAt || null,
            });
            get().clearSimulation();
        },

        // ── Save / Export / Import ───────────────────────────────
        saveProject: () => {
            const id = get().activeProjectId;
            if (!id) return;
            const now = new Date().toISOString();
            storage.updateProject(id, { lastSavedAt: now });
            set({ lastSavedAt: now, projects: storage.getProjects() });
            showToast('Saved to browser ✓');
        },

        exportProject: () => {
            const id = get().activeProjectId;
            if (!id) return;
            const exported = storage.exportProject(id);
            if (!exported.project) {
                showToast('Export failed: Project not found');
                return;
            }
            _downloadJson(exported, `flowwand-${_slug(exported.project.name)}-${Date.now()}.json`);
            showToast('Project exported as JSON');
        },

        importProject: (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const bundle = JSON.parse(e.target?.result as string);
                    if (!bundle.project || !bundle.data) throw new Error('Invalid file format');
                    const project = storage.importProject(bundle);
                    set({ projects: storage.getProjects() });
                    get().switchProject(project.id);
                    showToast(`Imported "${project.name}" ✓`);
                    resolve(project);
                } catch (err: any) {
                    showToast(`Import failed: ${err.message}`);
                    reject(err);
                }
            };
            reader.readAsText(file);
        }),

        // ── Topic actions ─────────────────────────────────────────
        addTopic: (...a) => topicActions().addTopic(...a),
        updateTopic: (...a) => topicActions().updateTopic(...a),
        deleteTopic: (...a) => topicActions().deleteTopic(...a),
        isTopicNameUnique: (n, x) => topicActions().isTopicNameUnique(n, x),

        // ── Flink Job actions ─────────────────────────────────────
        addFlinkJob: (...a) => jobActions().addFlinkJob(...a),
        updateFlinkJob: (...a) => jobActions().updateFlinkJob(...a),
        deleteFlinkJob: (...a) => jobActions().deleteFlinkJob(...a),

        // ── Flow actions ──────────────────────────────────────────
        addFlow: (...a) => flowActions().addFlow(...a),
        updateFlow: (...a) => flowActions().updateFlow(...a),
        deleteFlow: (...a) => flowActions().deleteFlow(...a),

        // ── Event actions ─────────────────────────────────────────
        addEvent: (...a) => eventActions().addEvent(...a),
        updateEvent: (...a) => eventActions().updateEvent(...a),
        deleteEvent: (...a) => eventActions().deleteEvent(...a),

        // ── Simulation ────────────────────────────────────────────
        ...simActions,

        // ── UI ───────────────────────────────────────────────────
        showToast,
        setSidebarTab: (tab) => set({ sidebarTab: tab }),
        setActiveFlow: (id) => set({ activeFlowId: id }),
        setLeftSidebar: (open) => set({ leftSidebarOpen: open }),
        setRightSidebar: (open) => set({ rightSidebarOpen: open }),
        openModal: (type, item = null) => set({ modalOpen: type, editingItem: item }),
        closeModal: () => set({ modalOpen: null, editingItem: null }),
        setSelectedNode: (id) => set({ selectedNodeId: id }),
    };
});

function _slug(str: string) { return str.replace(/[^a-z0-9]/gi, '-').toLowerCase(); }
function _downloadJson(data: any, filename: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
}

export default useStore;
