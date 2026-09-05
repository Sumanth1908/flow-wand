import { Consumer, DataFlow, EventStream, EventType } from '../types';

export interface ProjectData {
    streams: EventStream[];
    consumers: Consumer[];
    flows: DataFlow[];
    events: EventType[];
    nodePositions?: Record<string, { x: number; y: number }>;
    edgeRoutings?: Record<string, { cx: number; cy: number }>;
}

export const emptyProjectData = (): ProjectData => ({ streams: [], consumers: [], flows: [], events: [], nodePositions: {}, edgeRoutings: {} });

type Entities = Pick<ProjectData, 'streams' | 'consumers' | 'flows' | 'events'>;
export type ProjectMutation = {
    [K in keyof Entities]: { collection: K; entity: Entities[K][number]; type: 'put' }
        | { collection: K; id: string; type: 'delete' }
}[keyof Entities];

// All entity changes and reference cleanup go through this pure domain operation.
export function mutateProject(data: ProjectData, mutation: ProjectMutation): ProjectData {
    let next: ProjectData;
    if (mutation.type === 'put') {
        const list = data[mutation.collection];
        const exists = list.some(item => item.id === mutation.entity.id);
        next = { ...data, [mutation.collection]: exists
            ? list.map(item => item.id === mutation.entity.id ? mutation.entity : item)
            : [...list, mutation.entity] };
    } else {
        const { id, collection } = mutation;
        next = { ...data, [collection]: data[collection].filter(item => item.id !== id) };
        if (collection === 'streams') {
            next.consumers = data.consumers.map(c => ({
                ...c,
                sources: c.sources.filter(s => s.streamId !== id),
                sinks: c.sinks.filter(s => s.streamId !== id),
                dlqSink: c.dlqSink?.streamId === id ? undefined : c.dlqSink,
                routingRules: c.routingRules?.filter(r => r.sourceStreamId !== id && r.sinkStreamId !== id),
            }));
        }
        if (collection === 'consumers') {
            next.flows = data.flows.map(f => ({ ...f, consumerIds: f.consumerIds.filter(value => value !== id) }));
        }
        if (collection === 'events') {
            next.consumers = data.consumers.map(c => ({
                ...c,
                sources: c.sources.map(s => ({ ...s, eventIds: s.eventIds.filter(value => value !== id) })),
                sinks: c.sinks.map(s => ({ ...s, eventIds: s.eventIds.filter(value => value !== id) })),
                dlqSink: c.dlqSink ? { ...c.dlqSink, eventIds: c.dlqSink.eventIds.filter(value => value !== id) } : undefined,
                // Removing a filter must not silently turn a specific rule into a wildcard.
                routingRules: c.routingRules?.filter(r => r.sourceEventId !== id && r.outputEventId !== id)
                    .map(r => ({ ...r, eventIds: r.eventIds?.filter(value => value !== id) })),
            }));
        }
    }
    return cleanLayout(next);
}

export function cleanLayout(data: ProjectData): ProjectData {
    const nodes = new Set([...data.streams, ...data.consumers].map(n => n.id));
    const edges = new Set(data.consumers.flatMap(c => [
        ...c.sources.map(s => `${s.streamId}->${c.id}`),
        ...c.sinks.map(s => `${c.id}->${s.streamId}`),
    ]));
    return { ...data,
        nodePositions: Object.fromEntries(Object.entries(data.nodePositions ?? {}).filter(([id]) => nodes.has(id))),
        edgeRoutings: Object.fromEntries(Object.entries(data.edgeRoutings ?? {}).filter(([id]) => edges.has(id))),
    };
}
