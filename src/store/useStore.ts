/**
 * store/useStore.ts
 * Zustand store using TypeScript.
 */
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { buildEventStreamActions } from '../hooks/useEventStreams';
import { buildConsumerActions } from '../hooks/useConsumers';
import { buildFlowActions } from '../hooks/useFlows';
import { buildEventActions } from '../hooks/useEvents';
import { buildSimulationActions, INITIAL_SIM } from '../hooks/useSimulation';
import { useEventGeneration } from '../hooks/useEventGeneration';
import { StoreState, EventStream, Consumer, DataFlow, EventType, Project, EdgeStyle, EdgeShape, LayoutDirection, EdgePathStyle } from '../types';
import { DEMO_DATA } from '../lib/demoData';

const useStore = create<StoreState>((set, get) => {
    // Generate event payload hook dependency map
    const generatorDeps = useEventGeneration();
    const simActions = buildSimulationActions(get, set, generatorDeps);

    let _toastTimer: ReturnType<typeof setTimeout> | null = null;
    const showToast = (message: string) => {
        if (_toastTimer) clearTimeout(_toastTimer);
        set({ toastMessage: message });
        _toastTimer = setTimeout(() => set({ toastMessage: null }), 3000);
    };

    const getStreams = () => get().streams;
    const setStreams = (s: EventStream[]) => set({ streams: s });
    const getConsumers = () => get().consumers;
    const setConsumers = (c: Consumer[]) => set({ consumers: c });
    const getFlows = () => get().flows;
    const setFlows = (f: DataFlow[]) => set({ flows: f });
    const getEvents = () => get().events;
    const setEvents = (e: EventType[]) => set({ events: e });
    const getProjId = () => get().activeProjectId;

    const streamActions = () => buildEventStreamActions(getProjId(), getStreams, setStreams, showToast);
    const consumerActions = () => buildConsumerActions(getProjId(), getConsumers, setConsumers, getFlows, setFlows);
    const flowActions = () => buildFlowActions(getProjId(), getFlows, setFlows);
    const eventActions = () => buildEventActions(getProjId(), getEvents, setEvents, getConsumers, setConsumers);

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
        lastSavedAt: null,
        traceMode: false,
        edgeStyle: 'solid',
        edgeShape: 'circle',
        layoutDirection: 'LR',
        edgePathStyle: 'bezier',
        nodePositions: {},
        edgeRoutings: {},
        hoveredEdgeId: null,

        // ── App init ─────────────────────────────────────────────
        init: () => {
            const prefs = storage.getPrefs();
            const projects = storage.getProjects();
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
                streams: [], consumers: [], flows: [], events: [],
                activeFlowId: null, lastSavedAt: null, nodePositions: {}, edgeRoutings: {},
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
                    set({ activeProjectId: null, streams: [], consumers: [], flows: [], events: [], activeFlowId: null });
                }
            }
        },

        switchProject: (projectId) => {
            const data = storage.getProjectData(projectId);
            const project = storage.getProjects().find(p => p.id === projectId);
            storage.savePrefs({ ...storage.getPrefs(), activeProjectId: projectId });
            set({
                activeProjectId: projectId,
                streams: data.streams || [],
                consumers: data.consumers || [],
                flows: data.flows || [],
                events: data.events || [],
                activeFlowId: null,
                lastSavedAt: project?.lastSavedAt || null,
                nodePositions: data.nodePositions || {},
                edgeRoutings: data.edgeRoutings || {},
            });
            get().clearSimulation();
        },

        // ── Save / Export / Import ───────────────────────────────
        saveProject: () => {
            const id = get().activeProjectId;
            if (!id) return;
            const now = new Date().toISOString();
            storage.updateProject(id, { lastSavedAt: now });

            // Ensure node positions are also persisted in the project data blob
            const data = storage.getProjectData(id);
            data.nodePositions = get().nodePositions;
            data.edgeRoutings = get().edgeRoutings;
            storage.saveProjectData(id, data);

            set({ lastSavedAt: now, projects: storage.getProjects() });
            showToast('Saved to browser ✓');
        },

        updateNodePositions: (positions) => {
            set(s => ({ nodePositions: { ...s.nodePositions, ...positions } }));
        },

        updateEdgeRouting: (edgeId, point) => {
            set(s => {
                const next = { ...s.edgeRoutings };
                if (point === null) {
                    delete next[edgeId];
                } else {
                    next[edgeId] = point;
                }
                return { edgeRoutings: next };
            });
        },

        setHoveredEdge: (id) => set({ hoveredEdgeId: id }),

        resetLayout: () => {
            set({ nodePositions: {}, edgeRoutings: {} });
            const id = get().activeProjectId;
            if (id) {
                const data = storage.getProjectData(id);
                data.nodePositions = {};
                data.edgeRoutings = {};
                storage.saveProjectData(id, data);
            }
            showToast('Layout reset to default ✓');
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

        // ── Stream actions ─────────────────────────────────────────
        addStream: (...a) => streamActions().addStream(...a),
        updateStream: (...a) => streamActions().updateStream(...a),
        deleteStream: (...a) => streamActions().deleteStream(...a),
        isStreamNameUnique: (n, x) => streamActions().isStreamNameUnique(n, x),

        // ── Consumer actions ─────────────────────────────────────
        addConsumer: (...a) => consumerActions().addConsumer(...a),
        updateConsumer: (...a) => consumerActions().updateConsumer(...a),
        deleteConsumer: (...a) => consumerActions().deleteConsumer(...a),

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
        setTraceMode: (enabled) => set({ traceMode: enabled }),
        setEdgeStyle: (style) => {
            storage.savePrefs({ ...storage.getPrefs(), edgeStyle: style });
            set({ edgeStyle: style });
        },
        setEdgeShape: (shape) => {
            storage.savePrefs({ ...storage.getPrefs(), edgeShape: shape });
            set({ edgeShape: shape });
        },
        setLayoutDirection: (layout) => {
            storage.savePrefs({ ...storage.getPrefs(), layoutDirection: layout });
            set({ layoutDirection: layout, nodePositions: {} });
        },
        setEdgePathStyle: (style) => {
            storage.savePrefs({ ...storage.getPrefs(), edgePathStyle: style });
            set({ edgePathStyle: style });
        },

        loadDemo: () => {
            const project = get().createProject('E-Commerce Demo', 'Sample order processing pipeline with Kafka streams, consumers, and event-driven flows');
            const id = project.id;
            storage.saveProjectData(id, {
                streams: DEMO_DATA.streams,
                consumers: DEMO_DATA.consumers,
                flows: DEMO_DATA.flows,
                events: DEMO_DATA.events,
            });
            get().switchProject(id);
            showToast('Demo project loaded 🚀');
        },

        resetApp: () => {
            localStorage.clear();
            set({
                projects: [],
                activeProjectId: null,
                streams: [],
                consumers: [],
                flows: [],
                events: [],
                activeFlowId: null,
                simulation: { ...get().simulation, active: false, eventLog: [], visitedStreamIds: [], visitedConsumerIds: [], activeEdgeIds: [] },
                lastSavedAt: null,
                nodePositions: {},
                edgeRoutings: {},
            });
            showToast('Application reset to fresh state 🧹');
        },
    };
});

const _slug = (str: string) => str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
const _downloadJson = (data: any, filename: string) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
};

export default useStore;
