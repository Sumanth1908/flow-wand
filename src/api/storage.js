/**
 * Abstract API layer backed by localStorage.
 * Data is organized per-project. Each project gets its own key.
 * Projects list is stored under 'flowwand_projects'.
 * Project data is stored under 'flowwand_project_<id>'.
 * Active project and theme are stored under 'flowwand_prefs'.
 */

const PROJECTS_KEY = 'flowwand_projects';
const PROJECT_DATA_PREFIX = 'flowwand_project_';
const PREFS_KEY = 'flowwand_prefs';

// ── Preferences ─────────────────────────────────────────

export const getPrefs = () => {
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load prefs', e);
    }
    return { activeProjectId: null, theme: 'dark' };
};

export const savePrefs = (prefs) => {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
        console.error('Failed to save prefs', e);
    }
};

// ── Projects ────────────────────────────────────────────

export const getProjects = () => {
    try {
        const raw = localStorage.getItem(PROJECTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load projects', e);
    }
    return [];
};

export const saveProjects = (projects) => {
    try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
        console.error('Failed to save projects', e);
    }
};

export const createProject = (project) => {
    const projects = getProjects();
    projects.push(project);
    saveProjects(projects);
    // Initialize empty project data
    saveProjectData(project.id, getDefaultProjectData());
    return project;
};

export const updateProject = (id, updates) => {
    const projects = getProjects();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx !== -1) {
        projects[idx] = { ...projects[idx], ...updates };
        saveProjects(projects);
        return projects[idx];
    }
    return null;
};

export const deleteProject = (id) => {
    const projects = getProjects().filter((p) => p.id !== id);
    saveProjects(projects);
    try {
        localStorage.removeItem(PROJECT_DATA_PREFIX + id);
    } catch (e) {
        console.error('Failed to remove project data', e);
    }
};

// ── Project Data ────────────────────────────────────────

const getDefaultProjectData = () => ({
    topics: [],
    flinkJobs: [],
    flows: [],
});

export const getProjectData = (projectId) => {
    try {
        const raw = localStorage.getItem(PROJECT_DATA_PREFIX + projectId);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load project data', e);
    }
    return getDefaultProjectData();
};

const saveProjectData = (projectId, data) => {
    try {
        localStorage.setItem(PROJECT_DATA_PREFIX + projectId, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save project data', e);
    }
};

// ── Topics ──────────────────────────────────────────────

export const getTopics = (projectId) => {
    return getProjectData(projectId).topics;
};

export const createTopic = (projectId, topic) => {
    const data = getProjectData(projectId);
    data.topics.push(topic);
    saveProjectData(projectId, data);
    return topic;
};

export const updateTopic = (projectId, id, updates) => {
    const data = getProjectData(projectId);
    const idx = data.topics.findIndex((t) => t.id === id);
    if (idx !== -1) {
        data.topics[idx] = { ...data.topics[idx], ...updates };
        saveProjectData(projectId, data);
        return data.topics[idx];
    }
    return null;
};

export const deleteTopic = (projectId, id) => {
    const data = getProjectData(projectId);
    data.topics = data.topics.filter((t) => t.id !== id);
    data.flinkJobs = data.flinkJobs.map((job) => ({
        ...job,
        sourceTopics: job.sourceTopics.filter((tId) => tId !== id),
        sinkTopics: job.sinkTopics.filter((tId) => tId !== id),
    }));
    saveProjectData(projectId, data);
};

// ── Flink Jobs ──────────────────────────────────────────

export const getFlinkJobs = (projectId) => {
    return getProjectData(projectId).flinkJobs;
};

export const createFlinkJob = (projectId, job) => {
    const data = getProjectData(projectId);
    data.flinkJobs.push(job);
    saveProjectData(projectId, data);
    return job;
};

export const updateFlinkJob = (projectId, id, updates) => {
    const data = getProjectData(projectId);
    const idx = data.flinkJobs.findIndex((j) => j.id === id);
    if (idx !== -1) {
        data.flinkJobs[idx] = { ...data.flinkJobs[idx], ...updates };
        saveProjectData(projectId, data);
        return data.flinkJobs[idx];
    }
    return null;
};

export const deleteFlinkJob = (projectId, id) => {
    const data = getProjectData(projectId);
    data.flinkJobs = data.flinkJobs.filter((j) => j.id !== id);
    data.flows = data.flows.map((flow) => ({
        ...flow,
        jobIds: flow.jobIds.filter((jId) => jId !== id),
    }));
    saveProjectData(projectId, data);
};

// ── Flows ───────────────────────────────────────────────

export const getFlows = (projectId) => {
    return getProjectData(projectId).flows;
};

export const createFlow = (projectId, flow) => {
    const data = getProjectData(projectId);
    data.flows.push(flow);
    saveProjectData(projectId, data);
    return flow;
};

export const updateFlow = (projectId, id, updates) => {
    const data = getProjectData(projectId);
    const idx = data.flows.findIndex((f) => f.id === id);
    if (idx !== -1) {
        data.flows[idx] = { ...data.flows[idx], ...updates };
        saveProjectData(projectId, data);
        return data.flows[idx];
    }
    return null;
};

export const deleteFlow = (projectId, id) => {
    const data = getProjectData(projectId);
    data.flows = data.flows.filter((f) => f.id !== id);
    saveProjectData(projectId, data);
};

// ── Import / Export ─────────────────────────────────────

export const exportProject = (projectId) => {
    const projects = getProjects();
    const project = projects.find((p) => p.id === projectId);
    const data = getProjectData(projectId);
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        project,
        data,
    };
};

export const importProject = (exportedData) => {
    const { project, data } = exportedData;
    // Ensure the project exists in the list
    const projects = getProjects();
    const existingIdx = projects.findIndex((p) => p.id === project.id);
    if (existingIdx !== -1) {
        projects[existingIdx] = project;
    } else {
        projects.push(project);
    }
    saveProjects(projects);
    saveProjectData(project.id, data);
    return project;
};
