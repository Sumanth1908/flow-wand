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
        expect(data.consumers[0].routingRules?.[0]).toMatchObject({ sourceEventId: undefined, outputEventId: undefined, eventIds: [] });
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
