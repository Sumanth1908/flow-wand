import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useStore from './useStore';
import * as storage from '../lib/storage';
import { DEMO_DATA } from '../lib/demoData';
import { validateProjectData } from '../domain/validation';

class MemoryStorage {
    values = new Map<string, string>();
    get length() { return this.values.size; }
    getItem(key: string) { return this.values.get(key) ?? null; }
    setItem(key: string, value: string) { this.values.set(key, value); }
    removeItem(key: string) { this.values.delete(key); }
    key(index: number) { return [...this.values.keys()][index] ?? null; }
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('document', { documentElement: { setAttribute: vi.fn() } });
    useStore.setState(useStore.getInitialState(), true);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function projectWithStream() {
    const project = useStore.getState().createProject('Test')!;
    expect(project).not.toBeNull();
    expect(useStore.getState().addStream('source', 'kafka', 1, '')).toBe(true);
    return { project, stream: useStore.getState().streams[0] };
}

describe('project workflows', () => {
    it('round trips entity edits, node positions and edge routes without an explicit save', () => {
        const { project, stream } = projectWithStream();
        useStore.getState().addConsumer({ name: 'worker', description: '', sources: [{ streamId: stream.id, eventIds: [] }], sinks: [], shape: 'hexagon', type: 'worker' });
        const consumer = useStore.getState().consumers[0];
        const edge = `${stream.id}->${consumer.id}`;
        useStore.getState().updateNodePositions({ [stream.id]: { x: 100, y: 200 } });
        useStore.getState().updateEdgeRouting(edge, { cx: 200, cy: 300 });
        const exported = storage.exportProject(project.id);
        expect(exported.data.nodePositions?.[stream.id]).toEqual({ x: 100, y: 200 });
        expect(exported.data.edgeRoutings?.[edge]).toEqual({ cx: 200, cy: 300 });
        const imported = storage.importProject(exported);
        useStore.setState({ projects: storage.getProjects() });
        useStore.getState().switchProject(imported.id);
        expect(useStore.getState().consumers[0]).toMatchObject({ shape: 'hexagon', type: 'worker' });
        expect(useStore.getState().nodePositions[stream.id]).toEqual({ x: 100, y: 200 });
        expect(useStore.getState().edgeRoutings[edge]).toEqual({ cx: 200, cy: 300 });
    });
    it('does not report success, change timestamps or apply edits when storage fails', () => {
        const { stream } = projectWithStream();
        const saved = useStore.getState().lastSavedAt;
        vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
        expect(useStore.getState().updateStream(stream.id, { name: 'lost' })).toBe(false);
        useStore.getState().saveProject();
        expect(useStore.getState().lastSavedAt).toBe(saved);
        expect(useStore.getState().streams[0].name).toBe('source');
        expect(useStore.getState().toastMessage).toContain('could not save');
    });
    it('keeps the current project available if another project has damaged saved data', () => {
        const { project, stream } = projectWithStream();
        storage.createProject({ ...project, id: 'damaged', name: 'Damaged' });
        localStorage.setItem('fw_proj_damaged', '{invalid');
        useStore.setState({ projects: storage.getProjects() });
        useStore.getState().switchProject('damaged');
        expect(useStore.getState().activeProjectId).toBe(project.id);
        expect(useStore.getState().streams[0].id).toBe(stream.id);
        expect(localStorage.getItem('fw_proj_damaged')).toBe('{invalid');
        expect(useStore.getState().toastMessage).toContain('damaged');
    });
    it('survives a damaged project index without overwriting it', () => {
        localStorage.setItem('fw_projects', 'null');
        expect(() => useStore.getState().init()).not.toThrow();
        expect(localStorage.getItem('fw_projects')).toBe('null');
        expect(useStore.getState().recoveryError).toContain('projects');
    });
    it('cleans consumer references and layout atomically', () => {
        projectWithStream();
        useStore.getState().addConsumer({ name: 'worker', description: '', sources: [], sinks: [] });
        const consumer = useStore.getState().consumers[0];
        useStore.getState().addFlow('Flow', [consumer.id], '');
        useStore.getState().updateNodePositions({ [consumer.id]: { x: 4, y: 5 } });
        useStore.getState().deleteConsumer(consumer.id);
        expect(useStore.getState().flows[0].consumerIds).toEqual([]);
        expect(useStore.getState().nodePositions[consumer.id]).toBeUndefined();
    });
    it('marks playback complete on the last tick and permits another run', () => {
        const { stream } = projectWithStream();
        useStore.getState().startSimulation(stream.id, {});
        while (useStore.getState().advanceSimulation()) { /* simulate drawer timer */ }
        expect(useStore.getState().simulation.active).toBe(false);
        expect(useStore.getState().simulation.currentStep).toBe(useStore.getState().simulation.totalSteps);
        expect(useStore.getState().simulation.eventLog).toHaveLength(1);
        useStore.getState().startSimulation(stream.id, {});
        expect(useStore.getState().simulation.active).toBe(true);
    });
    it('clears old simulation and selection when creating a project', () => {
        const { stream } = projectWithStream();
        useStore.getState().startSimulation(stream.id, {});
        useStore.getState().setFocusedConsumer('old');
        useStore.getState().createProject('Next');
        expect(useStore.getState().simulation.active).toBe(false);
        expect(useStore.getState().simulation.steps).toEqual([]);
        expect(useStore.getState().focusedConsumerId).toBeNull();
    });
    it('loads and validates the complete demo', () => {
        expect(() => validateProjectData(DEMO_DATA)).not.toThrow();
        useStore.getState().loadDemo();
        expect(useStore.getState().streams.length).toBeGreaterThan(0);
    });
});
