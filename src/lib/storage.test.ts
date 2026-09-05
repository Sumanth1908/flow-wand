import { beforeEach, describe, expect, it } from 'vitest';
import * as storage from './storage';
import { Consumer, EventStream, EventType, Project } from '../types';

class MemoryStorage implements Storage {
    private values = new Map<string, string>();
    get length() { return this.values.size; }
    clear() { this.values.clear(); }
    getItem(key: string) { return this.values.get(key) ?? null; }
    key(index: number) { return [...this.values.keys()][index] ?? null; }
    removeItem(key: string) { this.values.delete(key); }
    setItem(key: string, value: string) { this.values.set(key, value); }
}

const project: Project = { id: 'project', name: 'Project', description: '', createdAt: '2026-01-01T00:00:00.000Z' };
const stream: EventStream = { id: 'stream', name: 'stream', type: 'kafka', description: '', partitions: 1 };
const event: EventType = { id: 'event', name: 'Event', description: '', schema: '{}' };
const consumer: Consumer = {
    id: 'consumer', name: 'consumer', description: '',
    sources: [{ streamId: 'stream', eventIds: ['event'] }],
    sinks: [{ streamId: 'sink', eventIds: ['event'] }],
    dlqSink: { streamId: 'stream', eventIds: ['event'] },
    routingRules: [{
        id: 'rule', sourceStreamId: 'stream', sourceEventId: 'event', condition: 'true',
        sinkStreamId: 'sink', outputEventId: 'event', eventIds: ['event'],
    }],
};

beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
    storage.createProject(project);
    storage.saveProjectData(project.id, {
        streams: [stream, { ...stream, id: 'sink', name: 'sink' }], consumers: [consumer], flows: [], events: [event],
        nodePositions: { stream: { x: 1, y: 2 } }, edgeRoutings: { 'stream->consumer': { cx: 1, cy: 2 } },
    });
});

describe('storage integrity', () => {
    it('removes stream references from connections, rules, layout, and DLQ settings', () => {
        const data = storage.deleteStream(project.id, 'stream');
        expect(data.consumers[0].sources).toEqual([]);
        expect(data.consumers[0].dlqSink).toBeUndefined();
        expect(data.consumers[0].routingRules).toEqual([]);
        expect(data.nodePositions).toEqual({});
        expect(data.edgeRoutings).toEqual({});
    });

    it('removes deleted event references everywhere', () => {
        const data = storage.deleteEvent(project.id, 'event');
        expect(data.consumers[0].sources[0].eventIds).toEqual([]);
        expect(data.consumers[0].sinks[0].eventIds).toEqual([]);
        expect(data.consumers[0].dlqSink?.eventIds).toEqual([]);
        expect(data.consumers[0].routingRules).toEqual([]);
    });

    it('clears only FlowWand-owned local storage keys', () => {
        localStorage.setItem('another_app', 'keep');
        storage.clearAppData();
        expect(localStorage.getItem('another_app')).toBe('keep');
        expect(storage.getProjects()).toEqual([]);
    });

    it('does not overwrite an existing project when importing a colliding ID', () => {
        const imported = storage.importProject({ project, data: { streams: [], consumers: [], flows: [], events: [] } });
        expect(imported.id).not.toBe(project.id);
        expect(imported.name).toBe('Project (Imported)');
        expect(storage.getProjects()).toHaveLength(2);
    });

    it('migrates legacy event examples when project data is read', () => {
        storage.saveProjectData(project.id, {
            streams: [], consumers: [], flows: [],
            events: [{ ...event, schema: '{"id":"uuid"}' }],
        });
        const migrated = storage.getProjectData(project.id).events[0];
        expect(JSON.parse(migrated.schema)).toMatchObject({ type: 'object', properties: { id: { format: 'uuid' } } });
        expect(JSON.parse(migrated.examplePayload || '')).toEqual({ id: 'uuid' });
    });
});

it.each([
    { streams: [{ id: 'bad' }], consumers: [], flows: [], events: [] },
    { streams: [{ ...stream, type: 'invalid' }], consumers: [], flows: [], events: [] },
    { streams: [stream, stream], consumers: [], flows: [], events: [] },
    { streams: [stream], consumers: [{ ...consumer, sources: [{ streamId: 'missing', eventIds: [] }] }], flows: [], events: [] },
    { streams: [], consumers: [], flows: [], events: [{ ...event, schema: 'broken' }] },
    { streams: [stream], consumers: [], flows: [], events: [], nodePositions: { stream: { x: 'bad', y: 2 } } },
])('rejects invalid imports before writing anything', data => {
    const before = localStorage.getItem('fw_projects');
    expect(() => storage.importProject({ version: 1, project: { ...project, id: 'invalid' }, data })).toThrow();
    expect(localStorage.getItem('fw_projects')).toBe(before);
    expect(localStorage.getItem('fw_proj_invalid')).toBeNull();
});

it('rejects future bundle versions without changing storage', () => {
    expect(() => storage.importProject({ ...storage.exportProject(project.id), version: 999 })).toThrow('unsupported');
    expect(storage.getProjects()).toHaveLength(1);
});

it('rolls back the project data if saving the project index fails', () => {
    const originalData = localStorage.getItem('fw_proj_project');
    const originalIndex = localStorage.getItem('fw_projects');
    const setItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key, value) => { if (key === 'fw_projects') throw new Error('quota'); setItem(key, value); };
    expect(() => storage.saveProjectSnapshot({ ...project, name: 'Changed' }, { streams: [], consumers: [], flows: [], events: [] })).toThrow();
    expect(localStorage.getItem('fw_proj_project')).toBe(originalData);
    expect(localStorage.getItem('fw_projects')).toBe(originalIndex);
});

it('migrates legacy topic/job connections on import', () => {
    const imported = storage.importProject({ project: { ...project, id: 'legacy' }, data: {
        topics: [{ ...stream, id: 'topic' }], flinkJobs: [{ id: 'job', name: 'Job', sourceTopics: ['topic'], sinkTopics: [] }],
        flows: [{ id: 'flow', name: 'Flow', jobIds: ['job'] }],
    } });
    const data = storage.getProjectData(imported.id);
    expect(data.consumers[0].sources).toEqual([{ streamId: 'topic', eventIds: [] }]);
    expect(data.flows[0].consumerIds).toEqual(['job']);
});

it('exports only FlowWand-owned raw keys for recovery', () => {
    localStorage.setItem('fw_proj_broken', '{broken');
    localStorage.setItem('another_app', 'private');
    const recovery = storage.exportRecoveryData();
    expect(recovery.fw_proj_broken).toBe('{broken');
    expect(recovery.another_app).toBeUndefined();
});
