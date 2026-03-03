/**
 * lib/storage.ts
 */
import { Project, EventStream, Consumer, DataFlow, EventType } from '../types';

const KEYS = {
    PROJECTS: 'fw_projects',
    PROJECT_PFX: 'fw_proj_',
    PREFS: 'fw_prefs',
};

interface ProjectData {
    streams: EventStream[];
    consumers: Consumer[];
    flows: DataFlow[];
    events: EventType[];
    nodePositions?: Record<string, { x: number, y: number }>;
    edgeRoutings?: Record<string, { cx: number, cy: number }>;
}

interface AppPrefs {
    activeProjectId: string | null;
    theme: string;
    edgeStyle?: string;
    edgeShape?: string;
    layoutDirection?: string;
    edgePathStyle?: string;
}

// ── helpers ─────────────────────────────────────────────────
const read = <T>(key: string, fallback: T): T => {
    try {
        const r = localStorage.getItem(key);
        return r ? JSON.parse(r) : fallback;
    } catch {
        return fallback;
    }
};

const write = (key: string, val: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
        console.error('storage write failed', e);
    }
};

// ── Preferences ─────────────────────────────────────────────
export const getPrefs = (): AppPrefs => read(KEYS.PREFS, { activeProjectId: null, theme: 'dark', edgeStyle: 'solid', edgeShape: 'circle', layoutDirection: 'LR', edgePathStyle: 'bezier' });
export const savePrefs = (prefs: AppPrefs) => write(KEYS.PREFS, prefs);

// ── Projects ─────────────────────────────────────────────────
export const getProjects = (): Project[] => read(KEYS.PROJECTS, []);
export const saveProjects = (list: Project[]) => write(KEYS.PROJECTS, list);

export const createProject = (project: Project) => {
    const list = getProjects();
    list.push(project);
    saveProjects(list);
    write(KEYS.PROJECT_PFX + project.id, { streams: [], consumers: [], flows: [], events: [] });
    return project;
};

export const updateProject = (id: string, patch: Partial<Project>) => {
    const list = getProjects().map(p => p.id === id ? { ...p, ...patch } : p);
    saveProjects(list);
};

export const deleteProject = (id: string) => {
    saveProjects(getProjects().filter(p => p.id !== id));
    try { localStorage.removeItem(KEYS.PROJECT_PFX + id); } catch { }
};

// ── Project data ─────────────────────────────────────────────
const defaultData = (): ProjectData => ({ streams: [], consumers: [], flows: [], events: [] });

export const getProjectData = (id: string): ProjectData => {
    const data = read(KEYS.PROJECT_PFX + id, defaultData()) as any;
    // Simple migration logic
    if (data.topics && !data.streams) {
        data.streams = data.topics.map((t: any) => ({
            ...t,
            type: t.type || 'kafka',
            eventIds: t.eventIds || []
        }));
        delete data.topics;
    }
    if (data.streams) {
        data.streams = data.streams.map((s: any) => ({
            ...s,
            eventIds: s.eventIds || []
        }));
    }
    if (data.flinkJobs && !data.consumers) {
        data.consumers = data.flinkJobs.map((j: any) => ({
            ...j,
            sources: (j.sourceTopics || []).map((tId: string) => ({ streamId: tId, eventIds: [] })),
            sinks: (j.sinkTopics || []).map((tId: string) => ({ streamId: tId, eventIds: [] })),
        }));
        delete data.flinkJobs;
    }
    if (data.flows) {
        data.flows = data.flows.map((f: any) => {
            if (f.jobIds && !f.consumerIds) {
                return { ...f, consumerIds: f.jobIds };
            }
            return f;
        });
    }

    // Migration for event tagging: from flat arrays to specific mappings
    if (data.consumers) {
        data.consumers = data.consumers.map((c: any) => {
            if (c.sourceStreams && !c.sources) {
                c.sources = c.sourceStreams.map((sId: string) => ({
                    streamId: sId,
                    eventIds: c.sourceEventIds || []
                }));
                delete c.sourceStreams;
                delete c.sourceEventIds;
            }
            if (c.sinkStreams && !c.sinks) {
                c.sinks = c.sinkStreams.map((sId: string) => ({
                    streamId: sId,
                    eventIds: c.sinkEventIds || []
                }));
                delete c.sinkStreams;
                delete c.sinkEventIds;
            }
            return c;
        });
    }

    return data;
};
export const saveProjectData = (id: string, data: ProjectData) => write(KEYS.PROJECT_PFX + id, data);

// ── Streams ──────────────────────────────────────────────────
export const createStream = (projectId: string, stream: EventStream) => {
    const d = getProjectData(projectId);
    d.streams.push(stream);
    saveProjectData(projectId, d);
};
export const updateStream = (projectId: string, id: string, patch: Partial<EventStream>) => {
    const d = getProjectData(projectId);
    d.streams = d.streams.map(t => t.id === id ? { ...t, ...patch } : t);
    saveProjectData(projectId, d);
};
export const deleteStream = (projectId: string, id: string) => {
    const d = getProjectData(projectId);
    d.streams = d.streams.filter(t => t.id !== id);
    d.consumers = d.consumers.map(c => ({
        ...c,
        sources: (c.sources || []).filter(s => s.streamId !== id),
        sinks: (c.sinks || []).filter(s => s.streamId !== id),
    }));
    saveProjectData(projectId, d);
};

// ── Consumers ──────────────────────────────────────────────
export const createConsumer = (projectId: string, consumer: Consumer) => {
    const d = getProjectData(projectId);
    d.consumers.push(consumer);
    saveProjectData(projectId, d);
};
export const updateConsumer = (projectId: string, id: string, patch: Partial<Consumer>) => {
    const d = getProjectData(projectId);
    d.consumers = d.consumers.map(j => j.id === id ? { ...j, ...patch } : j);
    saveProjectData(projectId, d);
};
export const deleteConsumer = (projectId: string, id: string) => {
    const d = getProjectData(projectId);
    d.consumers = d.consumers.filter(j => j.id !== id);
    d.flows = d.flows.map(f => ({ ...f, consumerIds: (f.consumerIds || []).filter(x => x !== id) }));
    saveProjectData(projectId, d);
};

// ── Flows ────────────────────────────────────────────────────
export const createFlow = (projectId: string, flow: DataFlow) => {
    const d = getProjectData(projectId);
    d.flows.push(flow);
    saveProjectData(projectId, d);
};
export const updateFlow = (projectId: string, id: string, patch: Partial<DataFlow>) => {
    const d = getProjectData(projectId);
    d.flows = d.flows.map(f => f.id === id ? { ...f, ...patch } : f);
    saveProjectData(projectId, d);
};
export const deleteFlow = (projectId: string, id: string) => {
    const d = getProjectData(projectId);
    d.flows = d.flows.filter(f => f.id !== id);
    saveProjectData(projectId, d);
};

// ── Events ──────────────────────────────────────────────────
export const createEvent = (projectId: string, event: EventType) => {
    const d = getProjectData(projectId);
    if (!d.events) d.events = [];
    d.events.push(event);
    saveProjectData(projectId, d);
};
export const updateEvent = (projectId: string, id: string, patch: Partial<EventType>) => {
    const d = getProjectData(projectId);
    d.events = (d.events || []).map(e => e.id === id ? { ...e, ...patch } : e);
    saveProjectData(projectId, d);
};
export const deleteEvent = (projectId: string, id: string) => {
    const d = getProjectData(projectId);
    d.events = (d.events || []).filter(e => e.id !== id);
    d.consumers = d.consumers.map(c => ({
        ...c,
        sources: (c.sources || []).map(s => ({ ...s, eventIds: (s.eventIds || []).filter(eid => eid !== id) })),
        sinks: (c.sinks || []).map(s => ({ ...s, eventIds: (s.eventIds || []).filter(eid => eid !== id) })),
    }));
    saveProjectData(projectId, d);
};

// ── Import / Export ─────────────────────────────────────────
export const exportProject = (id: string) => {
    const projects = getProjects();
    const project = projects.find(p => p.id === id);
    const data = getProjectData(id);
    return { version: 1, exportedAt: new Date().toISOString(), project, data };
};
export const importProject = (bundle: { project: Project, data: ProjectData }) => {
    const { project, data } = bundle;
    const list = getProjects();
    const idx = list.findIndex(p => p.id === project.id);
    if (idx >= 0) list[idx] = project; else list.push(project);
    saveProjects(list);
    saveProjectData(project.id, data);
    return project;
};

