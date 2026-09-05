import { Project, EventStream, Consumer, DataFlow, EventType } from '../types';
import { v4 as uuid } from 'uuid';
import { emptyProjectData, mutateProject, ProjectData, ProjectMutation } from '../domain/project';
import { validateBundle, validateProjectData, validateProjects } from '../domain/validation';
export type { ProjectData } from '../domain/project';

const KEYS = { PROJECTS: 'fw_projects', PROJECT_PFX: 'fw_proj_', PREFS: 'fw_prefs' };
interface AppPrefs {
    activeProjectId: string | null;
    theme: string;
    edgeStyle?: string;
    edgeShape?: string;
    layoutDirection?: string;
    edgePathStyle?: string;
}
const read = (key: string, fallback: unknown): unknown => {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { throw new Error(`Saved data in ${key} is damaged. Export or remove this project to recover.`); }
};
const write = (key: string, value: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { throw new Error('Browser storage could not save your changes. Free some space or export a backup and try again.'); }
};

// Roll back earlier writes if a later write fails. The data blob is written before its index entry.
const transaction = (entries: [string, unknown][]) => {
    const previous = entries.map(([key]) => [key, localStorage.getItem(key)] as const);
    let completed = 0;
    try {
        for (const [key, value] of entries) { write(key, value); completed++; }
    } catch (error) {
        for (let i = completed - 1; i >= 0; i--) {
            const [key, value] = previous[i];
            if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
        }
        throw error;
    }
};

export const getPrefs = (): AppPrefs => {
    const defaults: AppPrefs = { activeProjectId: null, theme: 'dark', edgeStyle: 'solid', edgeShape: 'circle', layoutDirection: 'LR', edgePathStyle: 'bezier' };
    try {
        const raw = read(KEYS.PREFS, {}) as Record<string, unknown>;
        const result = { ...defaults };
        const choices = { theme: ['dark', 'light'], edgeStyle: ['solid', 'dashed', 'dotted'], edgeShape: ['circle', 'square', 'diamond', 'star', 'pizza', 'ghost', 'heart', 'alien', 'rocket'], layoutDirection: ['LR', 'TB'], edgePathStyle: ['bezier', 'step', 'straight'] };
        for (const key of Object.keys(choices) as (keyof typeof choices)[]) {
            if (typeof raw[key] === 'string' && choices[key].includes(raw[key] as string)) result[key] = raw[key] as string;
        }
        if (typeof raw.activeProjectId === 'string') result.activeProjectId = raw.activeProjectId;
        return result;
    } catch { return defaults; }
};
export const savePrefs = (prefs: AppPrefs) => write(KEYS.PREFS, prefs);
export const getProjects = (): Project[] => validateProjects(read(KEYS.PROJECTS, []));
export const saveProjects = (projects: Project[]) => write(KEYS.PROJECTS, projects);
export const getProjectData = (id: string): ProjectData => validateProjectData(read(KEYS.PROJECT_PFX + id, emptyProjectData()));
export const saveProjectData = (id: string, data: ProjectData) => write(KEYS.PROJECT_PFX + id, data);

export const saveProjectSnapshot = (project: Project, data: ProjectData) => {
    const projects = getProjects();
    const next = projects.some(p => p.id === project.id)
        ? projects.map(p => p.id === project.id ? project : p) : [...projects, project];
    transaction([[KEYS.PROJECT_PFX + project.id, data], [KEYS.PROJECTS, next]]);
    return next;
};
export const createProject = (project: Project) => { saveProjectSnapshot(project, emptyProjectData()); return project; };
export const updateProject = (id: string, patch: Partial<Project>) => saveProjects(getProjects().map(p => p.id === id ? { ...p, ...patch, id } : p));
export const deleteProject = (id: string) => {
    saveProjects(getProjects().filter(p => p.id !== id));
    localStorage.removeItem(KEYS.PROJECT_PFX + id);
};

const mutate = (projectId: string, mutation: ProjectMutation) => {
    const next = mutateProject(getProjectData(projectId), mutation);
    saveProjectData(projectId, next);
    return next;
};

export const createStream = (projectId: string, entity: EventStream) => mutate(projectId, { type: 'put', collection: 'streams', entity });
export const updateStream = (projectId: string, id: string, patch: Partial<EventStream>) => {
    const data = getProjectData(projectId), entity = data.streams.find(e => e.id === id);
    if (!entity) throw new Error('Entity not found');
    const next = mutateProject(data, { type: 'put', collection: 'streams', entity: { ...entity, ...patch, id } });
    saveProjectData(projectId, next);
    return next;
};
export const deleteStream = (projectId: string, id: string) => mutate(projectId, { type: 'delete', collection: 'streams', id });

export const createConsumer = (projectId: string, entity: Consumer) => mutate(projectId, { type: 'put', collection: 'consumers', entity });
export const updateConsumer = (projectId: string, id: string, patch: Partial<Consumer>) => {
    const data = getProjectData(projectId), entity = data.consumers.find(e => e.id === id);
    if (!entity) throw new Error('Entity not found');
    const next = mutateProject(data, { type: 'put', collection: 'consumers', entity: { ...entity, ...patch, id } });
    saveProjectData(projectId, next);
    return next;
};
export const deleteConsumer = (projectId: string, id: string) => mutate(projectId, { type: 'delete', collection: 'consumers', id });

export const createFlow = (projectId: string, entity: DataFlow) => mutate(projectId, { type: 'put', collection: 'flows', entity });
export const updateFlow = (projectId: string, id: string, patch: Partial<DataFlow>) => {
    const data = getProjectData(projectId), entity = data.flows.find(e => e.id === id);
    if (!entity) throw new Error('Entity not found');
    const next = mutateProject(data, { type: 'put', collection: 'flows', entity: { ...entity, ...patch, id } });
    saveProjectData(projectId, next);
    return next;
};
export const deleteFlow = (projectId: string, id: string) => mutate(projectId, { type: 'delete', collection: 'flows', id });

export const createEvent = (projectId: string, entity: EventType) => mutate(projectId, { type: 'put', collection: 'events', entity });
export const updateEvent = (projectId: string, id: string, patch: Partial<EventType>) => {
    const data = getProjectData(projectId), entity = data.events.find(e => e.id === id);
    if (!entity) throw new Error('Entity not found');
    const next = mutateProject(data, { type: 'put', collection: 'events', entity: { ...entity, ...patch, id } });
    saveProjectData(projectId, next);
    return next;
};
export const deleteEvent = (projectId: string, id: string) => mutate(projectId, { type: 'delete', collection: 'events', id });

export const exportProject = (id: string, snapshot?: ProjectData) => ({
    version: 1, exportedAt: new Date().toISOString(), project: getProjects().find(p => p.id === id), data: snapshot ?? getProjectData(id),
});
export const importProject = (value: unknown) => {
    const bundle = validateBundle(value);
    const collision = getProjects().some(p => p.id === bundle.project.id);
    const project = collision ? { ...bundle.project, id: uuid(), name: `${bundle.project.name} (Imported)`, createdAt: new Date().toISOString() } : bundle.project;
    saveProjectSnapshot(project, bundle.data);
    return project;
};
export const clearAppData = () => {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    keys.filter((key): key is string => !!key && (key === KEYS.PROJECTS || key === KEYS.PREFS || key.startsWith(KEYS.PROJECT_PFX)))
        .forEach(key => localStorage.removeItem(key));
};

// Preserve raw values so even malformed JSON can be recovered from a downloaded backup.
export const exportRecoveryData = () => Object.fromEntries(
    Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
        .filter((key): key is string => !!key && (key === KEYS.PROJECTS || key === KEYS.PREFS || key.startsWith(KEYS.PROJECT_PFX)))
        .map(key => [key, localStorage.getItem(key)])
);
