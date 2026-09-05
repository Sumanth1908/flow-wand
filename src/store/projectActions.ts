import { v4 as uuid } from 'uuid';
import { StoreState } from '../types';
import { mutateProject, ProjectData, ProjectMutation } from '../domain/project';

type ProjectActions = Pick<StoreState, 'addStream' | 'updateStream' | 'deleteStream' | 'isStreamNameUnique' | 'addConsumer' | 'updateConsumer' | 'deleteConsumer' | 'addFlow' | 'updateFlow' | 'deleteFlow' | 'addEvent' | 'updateEvent' | 'deleteEvent'>;
export const projectSnapshot = (state: ProjectData): ProjectData => ({
    streams: state.streams, consumers: state.consumers, events: state.events, flows: state.flows,
    nodePositions: state.nodePositions, edgeRoutings: state.edgeRoutings,
});
export function buildProjectActions(get: () => StoreState, commit: (data: ProjectData) => boolean): ProjectActions {
    const apply = (mutation: ProjectMutation) => commit(mutateProject(projectSnapshot(get()), mutation));
    const unique = (name: string, exclude?: string | null) => !get().streams.some(s => s.id !== exclude && s.name.toLowerCase() === name.trim().toLowerCase());
    return {
        isStreamNameUnique: unique,
        addStream: (name, type, partitions, description, isDLQ = false) => {
            if (!unique(name)) { get().showToast(`Event Stream "${name}" already exists`); return false; }
            return apply({ type: 'put', collection: 'streams', entity: { id: uuid(), name: name.trim(), type, partitions, description, isDLQ } });
        },
        updateStream: (id, patch) => {
            const current = get().streams.find(s => s.id === id);
            if (!current) return false;
            if (patch.name && !unique(patch.name, id)) { get().showToast(`Event Stream "${patch.name}" already exists`); return false; }
            return apply({ type: 'put', collection: 'streams', entity: { ...current, ...patch, id } });
        },
        deleteStream: id => apply({ type: 'delete', collection: 'streams', id }),
        addConsumer: input => apply({ type: 'put', collection: 'consumers', entity: { ...input, id: uuid() } }),
        updateConsumer: (id, patch) => {
            const current = get().consumers.find(c => c.id === id);
            return current ? apply({ type: 'put', collection: 'consumers', entity: { ...current, ...patch, id } }) : false;
        },
        deleteConsumer: id => apply({ type: 'delete', collection: 'consumers', id }),
        addFlow: (name, consumerIds, description) => apply({ type: 'put', collection: 'flows', entity: { id: uuid(), name, consumerIds, description } }),
        updateFlow: (id, patch) => {
            const current = get().flows.find(f => f.id === id);
            return current ? apply({ type: 'put', collection: 'flows', entity: { ...current, ...patch, id } }) : false;
        },
        deleteFlow: id => apply({ type: 'delete', collection: 'flows', id }),
        addEvent: (name, description, schema, examplePayload) => apply({ type: 'put', collection: 'events', entity: { id: uuid(), name, description, schema, examplePayload } }),
        updateEvent: (id, patch) => {
            const current = get().events.find(e => e.id === id);
            return current ? apply({ type: 'put', collection: 'events', entity: { ...current, ...patch, id } }) : false;
        },
        deleteEvent: id => apply({ type: 'delete', collection: 'events', id }),
    };
}
