import { Consumer, EventStream, EventType, Project, RoutingRule, StreamConnection } from '../types';
import { cleanLayout, ProjectData } from './project';
import { normalizeEventSchema } from '../lib/eventSchema';

const fail = (path: string, requirement: string): never => { throw new Error(`${path}: ${requirement}`); };
const object = (value: unknown, path: string): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(path, 'expected an object');
    return value as Record<string, unknown>;
};
const text = (value: unknown, path: string, fallback?: string): string => {
    if (value === undefined && fallback !== undefined) return fallback;
    if (typeof value !== 'string') return fail(path, 'expected text');
    return value;
};
const id = (value: unknown, path: string): string => {
    const result = text(value, path);
    if (!result.trim() || result.includes('->') || ['__proto__', 'constructor', 'prototype'].includes(result)) return fail(path, 'invalid ID');
    return result;
};
const name = (value: unknown, path: string) => {
    const result = text(value, path);
    return result.trim() ? result : fail(path, 'name cannot be empty');
};
const array = (value: unknown, path: string): unknown[] => Array.isArray(value) ? value : fail(path, 'expected an array');
const ids = (value: unknown, path: string) => array(value ?? [], path).map((v, i) => id(v, `${path}[${i}]`));
const choice = <const T extends string>(value: unknown, options: readonly T[], path: string, fallback?: T): T => {
    if (value === undefined && fallback !== undefined) return fallback;
    return options.includes(value as T) ? value as T : fail(path, `expected ${options.join(', ')}`);
};
const optionalText = (value: unknown, path: string) => value === undefined ? undefined : text(value, path);
const optionalId = (value: unknown, path: string) => value === undefined ? undefined : id(value, path);
const number = (value: unknown, path: string) => typeof value === 'number' && Number.isFinite(value) ? value : fail(path, 'expected a finite number');
const date = (value: unknown, path: string) => {
    const result = text(value, path);
    return Number.isFinite(Date.parse(result)) ? result : fail(path, 'invalid date');
};
const unique = (values: string[], path: string) => { if (new Set(values).size !== values.length) fail(path, 'duplicate IDs'); };
const reference = (value: string | undefined, known: Set<string>, path: string) => {
    if (value !== undefined && !known.has(value)) fail(path, `unknown reference "${value}"`);
};

export function validateProject(value: unknown): Project {
    const p = object(value, 'project');
    return { id: id(p.id, 'project.id'), name: name(p.name, 'project.name'), description: text(p.description, 'project.description', ''),
        createdAt: date(p.createdAt, 'project.createdAt'),
        lastSavedAt: p.lastSavedAt == null ? null : date(p.lastSavedAt, 'project.lastSavedAt') };
}

export function validateProjects(value: unknown): Project[] {
    const projects = array(value, 'projects').map(validateProject);
    unique(projects.map(p => p.id), 'projects');
    return projects;
}

export function validateProjectData(value: unknown): ProjectData {
    const data = object(value, 'data');
    // Migrations are applied to a new object; corrupt source data is never overwritten on read.
    const streams = array(data.streams ?? data.topics, 'streams').map((value, i): EventStream => {
        const path = `streams[${i}]`, s = object(value, path);
        const partitions = number(s.partitions ?? 1, `${path}.partitions`);
        if (!Number.isInteger(partitions) || partitions < 1) fail(path, 'partitions must be a positive integer');
        if (s.isDLQ !== undefined && typeof s.isDLQ !== 'boolean') fail(path, 'isDLQ must be boolean');
        return { id: id(s.id, `${path}.id`), name: name(s.name, `${path}.name`), description: text(s.description, path, ''),
            type: choice(s.type, ['kafka', 'sqs', 'sns', 'other'], path, 'kafka'), partitions, isDLQ: s.isDLQ as boolean | undefined };
    });
    const events = array(data.events ?? (data.topics ? [] : undefined), 'events').map((value, i): EventType => {
        const path = `events[${i}]`, e = object(value, path);
        const schema = text(e.schema, `${path}.schema`);
        try { object(JSON.parse(schema || '{}'), `${path}.schema`); } catch { fail(path, 'schema must be a JSON object'); }
        const examplePayload = optionalText(e.examplePayload, path);
        if (examplePayload?.trim()) { try { JSON.parse(examplePayload); } catch { fail(path, 'example must be valid JSON'); } }
        return normalizeEventSchema({ id: id(e.id, path), name: name(e.name, path), description: text(e.description, path, ''), schema, examplePayload });
    });
    const streamIds = new Set(streams.map(s => s.id)), eventIds = new Set(events.map(e => e.id));
    const connection = (value: unknown, path: string): StreamConnection => {
        const c = object(value, path), streamId = id(c.streamId, path), selected = ids(c.eventIds, path);
        reference(streamId, streamIds, path); selected.forEach(e => reference(e, eventIds, path));
        return { streamId, eventIds: [...new Set(selected)] };
    };
    const mergeConnections = (connections: StreamConnection[], source: boolean) => {
        const merged = new Map<string, StreamConnection>();
        for (const connection of connections) {
            const previous = merged.get(connection.streamId);
            merged.set(connection.streamId, { streamId: connection.streamId, eventIds: previous
                ? source && (!previous.eventIds.length || !connection.eventIds.length) ? [] : [...new Set([...previous.eventIds, ...connection.eventIds])]
                : connection.eventIds });
        }
        return [...merged.values()];
    };
    const consumers = array(data.consumers ?? data.flinkJobs, 'consumers').map((value, i): Consumer => {
        const path = `consumers[${i}]`, c = object(value, path);
        const legacy = (keys: unknown, events: unknown) => ids(keys, path).map(streamId => ({ streamId, eventIds: events ?? [] }));
        const sources = mergeConnections(array(c.sources ?? legacy(c.sourceStreams ?? c.sourceTopics, c.sourceEventIds), path).map(s => connection(s, path)), true);
        const sinks = mergeConnections(array(c.sinks ?? legacy(c.sinkStreams ?? c.sinkTopics, c.sinkEventIds), path).map(s => connection(s, path)), false);
        unique(sources.map(s => s.streamId), `${path}.sources`); unique(sinks.map(s => s.streamId), `${path}.sinks`);
        const failureRate = c.failureRate === undefined ? undefined : number(c.failureRate, path);
        if (failureRate !== undefined && (failureRate < 0 || failureRate > 1)) fail(path, 'failureRate must be between 0 and 1');
        const routingRules = array(c.routingRules ?? [], path).map((value): RoutingRule => {
            const r = object(value, path);
            const rule = { id: id(r.id, path), condition: text(r.condition, path), sinkStreamId: id(r.sinkStreamId, path),
                sourceStreamId: optionalId(r.sourceStreamId, path), sourceEventId: optionalId(r.sourceEventId, path),
                outputEventId: optionalId(r.outputEventId, path), eventIds: ids(r.eventIds, path), transformScript: optionalText(r.transformScript, path) };
            reference(rule.sinkStreamId, streamIds, path); reference(rule.sourceStreamId, streamIds, path);
            [rule.sourceEventId, rule.outputEventId, ...rule.eventIds].forEach(e => reference(e, eventIds, path));
            return rule;
        });
        // Older demos generated the same rule ID for two event mappings to one stream.
        const duplicateRuleIds = new Set(routingRules.filter((r, i, all) => all.findIndex(other => other.id === r.id) !== i).map(r => r.id));
        routingRules.forEach((rule, index) => {
            if (duplicateRuleIds.has(rule.id) && rule.id.startsWith(`${c.id}-demo-rule-`)) rule.id += `-migrated-${index}`;
        });
        unique(routingRules.map(r => r.id), `${path}.routingRules`);
        return { id: id(c.id, path), name: name(c.name, path), description: text(c.description, path, ''), sources, sinks,
            type: choice(c.type, ['default', 'lambda', 'service', 'database', 'api', 'worker', 'gateway', 'cache', 'scheduler', 'container'], path, 'default'),
            shape: c.shape === undefined ? undefined : choice(c.shape, ['rounded', 'rectangle', 'pill', 'hexagon', 'bevel', 'cylinder'], path),
            routingStrategy: choice(c.routingStrategy, ['broadcast', 'conditional', 'failover'], path, 'broadcast'), failureRate,
            transformScript: optionalText(c.transformScript, path), routingRules,
            dlqSink: c.dlqSink == null ? undefined : connection(c.dlqSink, `${path}.dlqSink`) };
    });
    const consumerIds = new Set(consumers.map(c => c.id));
    const flows = array(data.flows, 'flows').map((value, i) => {
        const path = `flows[${i}]`, f = object(value, path), selected = ids(f.consumerIds ?? f.jobIds, path);
        selected.forEach(value => reference(value, consumerIds, path));
        return { id: id(f.id, path), name: name(f.name, path), description: text(f.description, path, ''), consumerIds: selected };
    });
    unique([...streams, ...consumers].map(s => s.id), 'nodes'); unique(events.map(e => e.id), 'events'); unique(flows.map(f => f.id), 'flows');
    const positions = object(data.nodePositions ?? {}, 'nodePositions');
    const routings = object(data.edgeRoutings ?? {}, 'edgeRoutings');
    const nodePositions = Object.fromEntries(Object.entries(positions).map(([key, value]) => {
        const p = object(value, key); return [key, { x: number(p.x, key), y: number(p.y, key) }];
    }));
    const edgeRoutings = Object.fromEntries(Object.entries(routings).map(([key, value]) => {
        const p = object(value, key); return [key, { cx: number(p.cx, key), cy: number(p.cy, key) }];
    }));
    return cleanLayout({ streams, consumers, flows, events, nodePositions, edgeRoutings });
}

export function validateBundle(value: unknown) {
    const bundle = object(value, 'bundle');
    if (bundle.version !== undefined && bundle.version !== 1) fail('version', 'unsupported project version');
    return { project: validateProject(bundle.project), data: validateProjectData(bundle.data) };
}
