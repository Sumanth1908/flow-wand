/**
 * hooks/useEventStreams.ts
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { EventStream, StreamType } from '../types';

export function buildEventStreamActions(
    projectId: string | null,
    getStreams: () => EventStream[],
    setStreams: (streams: EventStream[]) => void,
    showToast: (message: string) => void
) {
    const isUnique = (name: string, excludeId: string | null = null) =>
        !getStreams().some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== excludeId);

    const addStream = (name: string, type: StreamType = 'kafka', partitions = 1, description = '', eventIds: string[] = []) => {
        if (!projectId) return false;
        if (!isUnique(name)) {
            showToast(`Event Stream "${name}" already exists`);
            return false;
        }
        const stream: EventStream = {
            id: uuid(),
            name,
            type,
            partitions,
            description,
            eventIds,
        };
        storage.createStream(projectId, stream);
        setStreams([...getStreams(), stream]);
        return true;
    };

    const updateStream = (id: string, patch: Partial<EventStream>) => {
        if (!projectId) return false;
        if (patch.name && !isUnique(patch.name, id)) {
            showToast(`Event Stream "${patch.name}" already exists`);
            return false;
        }
        storage.updateStream(projectId, id, patch);
        setStreams(getStreams().map(t => t.id === id ? { ...t, ...patch } : t));
        return true;
    };

    const deleteStream = (id: string) => {
        if (!projectId) return;
        storage.deleteStream(projectId, id);
        setStreams(getStreams().filter(t => t.id !== id));
    };

    return { addStream, updateStream, deleteStream, isStreamNameUnique: isUnique };
}
