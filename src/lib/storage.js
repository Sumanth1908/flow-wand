/**
 * lib/storage.js
 * ──────────────────────────────────────────────────────────
 * Raw localStorage adapter.  All public functions are pure
 * read/write operations with NO business logic.
 *
 * To migrate to a real API: replace the body of each function
 * with a fetch() call (or wrap the module in a hook that
 * returns these as async functions) — the rest of the app
 * doesn't need to change.
 */

const KEYS = {
    PROJECTS: 'fw_projects',
    PROJECT_PFX: 'fw_proj_',
    PREFS: 'fw_prefs',
};

// ── helpers ─────────────────────────────────────────────────
const read = (key, fallback) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } };
const write = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('storage write failed', e); } };

// ── Preferences ─────────────────────────────────────────────
export const getPrefs = () => read(KEYS.PREFS, { activeProjectId: null, theme: 'dark' });
export const savePrefs = (prefs) => write(KEYS.PREFS, prefs);

// ── Projects ─────────────────────────────────────────────────
export const getProjects = () => read(KEYS.PROJECTS, []);
export const saveProjects = (list) => write(KEYS.PROJECTS, list);

export const createProject = (project) => {
    const list = getProjects();
    list.push(project);
    saveProjects(list);
    write(KEYS.PROJECT_PFX + project.id, { topics: [], flinkJobs: [], flows: [], events: [] });
    return project;
};

export const updateProject = (id, patch) => {
    const list = getProjects().map(p => p.id === id ? { ...p, ...patch } : p);
    saveProjects(list);
};

export const deleteProject = (id) => {
    saveProjects(getProjects().filter(p => p.id !== id));
    try { localStorage.removeItem(KEYS.PROJECT_PFX + id); } catch { }
};

// ── Project data ─────────────────────────────────────────────
const defaultData = () => ({ topics: [], flinkJobs: [], flows: [], events: [] });

export const getProjectData = (id) => read(KEYS.PROJECT_PFX + id, defaultData());
export const saveProjectData = (id, data) => write(KEYS.PROJECT_PFX + id, data);

// ── Topics ──────────────────────────────────────────────────
export const createTopic = (projectId, topic) => {
    const d = getProjectData(projectId);
    d.topics.push(topic);
    saveProjectData(projectId, d);
};
export const updateTopic = (projectId, id, patch) => {
    const d = getProjectData(projectId);
    d.topics = d.topics.map(t => t.id === id ? { ...t, ...patch } : t);
    saveProjectData(projectId, d);
};
export const deleteTopic = (projectId, id) => {
    const d = getProjectData(projectId);
    d.topics = d.topics.filter(t => t.id !== id);
    d.flinkJobs = d.flinkJobs.map(j => ({
        ...j,
        sourceTopics: j.sourceTopics.filter(x => x !== id),
        sinkTopics: j.sinkTopics.filter(x => x !== id),
    }));
    saveProjectData(projectId, d);
};

// ── Flink Jobs ──────────────────────────────────────────────
export const createFlinkJob = (projectId, job) => {
    const d = getProjectData(projectId);
    d.flinkJobs.push(job);
    saveProjectData(projectId, d);
};
export const updateFlinkJob = (projectId, id, patch) => {
    const d = getProjectData(projectId);
    d.flinkJobs = d.flinkJobs.map(j => j.id === id ? { ...j, ...patch } : j);
    saveProjectData(projectId, d);
};
export const deleteFlinkJob = (projectId, id) => {
    const d = getProjectData(projectId);
    d.flinkJobs = d.flinkJobs.filter(j => j.id !== id);
    d.flows = d.flows.map(f => ({ ...f, jobIds: f.jobIds.filter(x => x !== id) }));
    saveProjectData(projectId, d);
};

// ── Flows ────────────────────────────────────────────────────
export const createFlow = (projectId, flow) => {
    const d = getProjectData(projectId);
    d.flows.push(flow);
    saveProjectData(projectId, d);
};
export const updateFlow = (projectId, id, patch) => {
    const d = getProjectData(projectId);
    d.flows = d.flows.map(f => f.id === id ? { ...f, ...patch } : f);
    saveProjectData(projectId, d);
};
export const deleteFlow = (projectId, id) => {
    const d = getProjectData(projectId);
    d.flows = d.flows.filter(f => f.id !== id);
    saveProjectData(projectId, d);
};

// ── Events ──────────────────────────────────────────────────
export const createEvent = (projectId, event) => {
    const d = getProjectData(projectId);
    if (!d.events) d.events = [];
    d.events.push(event);
    saveProjectData(projectId, d);
};
export const updateEvent = (projectId, id, patch) => {
    const d = getProjectData(projectId);
    d.events = (d.events || []).map(e => e.id === id ? { ...e, ...patch } : e);
    saveProjectData(projectId, d);
};
export const deleteEvent = (projectId, id) => {
    const d = getProjectData(projectId);
    d.events = (d.events || []).filter(e => e.id !== id);
    // Remove eventId from any topics that reference it
    d.topics = d.topics.map(t => ({
        ...t,
        eventIds: (t.eventIds || []).filter(x => x !== id),
    }));
    saveProjectData(projectId, d);
};

// ── Import / Export ─────────────────────────────────────────
export const exportProject = (id) => {
    const projects = getProjects();
    const project = projects.find(p => p.id === id);
    const data = getProjectData(id);
    return { version: 1, exportedAt: new Date().toISOString(), project, data };
};
export const importProject = (bundle) => {
    const { project, data } = bundle;
    const list = getProjects();
    const idx = list.findIndex(p => p.id === project.id);
    if (idx >= 0) list[idx] = project; else list.push(project);
    saveProjects(list);
    saveProjectData(project.id, data);
    return project;
};
