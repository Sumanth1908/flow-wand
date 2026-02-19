/**
 * lib/storage.ts
 */
import { Project, Topic, FlinkJob, DataFlow, EventType } from '../types';

const KEYS = {
    PROJECTS: 'fw_projects',
    PROJECT_PFX: 'fw_proj_',
    PREFS: 'fw_prefs',
};

interface ProjectData {
    topics: Topic[];
    flinkJobs: FlinkJob[];
    flows: DataFlow[];
    events: EventType[];
}

interface AppPrefs {
    activeProjectId: string | null;
    theme: string;
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
export const getPrefs = (): AppPrefs => read(KEYS.PREFS, { activeProjectId: null, theme: 'dark' });
export const savePrefs = (prefs: AppPrefs) => write(KEYS.PREFS, prefs);

// ── Projects ─────────────────────────────────────────────────
export const getProjects = (): Project[] => read(KEYS.PROJECTS, []);
export const saveProjects = (list: Project[]) => write(KEYS.PROJECTS, list);

export const createProject = (project: Project) => {
    const list = getProjects();
    list.push(project);
    saveProjects(list);
    write(KEYS.PROJECT_PFX + project.id, { topics: [], flinkJobs: [], flows: [], events: [] });
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
const defaultData = (): ProjectData => ({ topics: [], flinkJobs: [], flows: [], events: [] });

export const getProjectData = (id: string): ProjectData => read(KEYS.PROJECT_PFX + id, defaultData());
export const saveProjectData = (id: string, data: ProjectData) => write(KEYS.PROJECT_PFX + id, data);

// ── Topics ──────────────────────────────────────────────────
export const createTopic = (projectId: string, topic: Topic) => {
    const d = getProjectData(projectId);
    d.topics.push(topic);
    saveProjectData(projectId, d);
};
export const updateTopic = (projectId: string, id: string, patch: Partial<Topic>) => {
    const d = getProjectData(projectId);
    d.topics = d.topics.map(t => t.id === id ? { ...t, ...patch } : t);
    saveProjectData(projectId, d);
};
export const deleteTopic = (projectId: string, id: string) => {
    const d = getProjectData(projectId);
    d.topics = d.topics.filter(t => t.id !== id);
    d.flinkJobs = d.flinkJobs.map(j => ({
        ...j,
        sourceTopics: (j.sourceTopics || []).filter(x => x !== id),
        sinkTopics: (j.sinkTopics || []).filter(x => x !== id),
    }));
    saveProjectData(projectId, d);
};

// ── Flink Jobs ──────────────────────────────────────────────
export const createFlinkJob = (projectId: string, job: FlinkJob) => {
    const d = getProjectData(projectId);
    d.flinkJobs.push(job);
    saveProjectData(projectId, d);
};
export const updateFlinkJob = (projectId: string, id: string, patch: Partial<FlinkJob>) => {
    const d = getProjectData(projectId);
    d.flinkJobs = d.flinkJobs.map(j => j.id === id ? { ...j, ...patch } : j);
    saveProjectData(projectId, d);
};
export const deleteFlinkJob = (projectId: string, id: string) => {
    const d = getProjectData(projectId);
    d.flinkJobs = d.flinkJobs.filter(j => j.id !== id);
    d.flows = d.flows.map(f => ({ ...f, jobIds: (f.jobIds || []).filter(x => x !== id) }));
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
    d.topics = d.topics.map(t => ({
        ...t,
        eventIds: (t.eventIds || []).filter(x => x !== id),
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
