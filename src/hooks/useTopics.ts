/**
 * hooks/useTopics.ts
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { Topic } from '../types';

export function buildTopicActions(
    projectId: string | null,
    getTopics: () => Topic[],
    setTopics: (topics: Topic[]) => void,
    showToast: (message: string) => void
) {
    const isUnique = (name: string, excludeId: string | null = null) =>
        !getTopics().some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== excludeId);

    const addTopic = (name: string, partitions = 1, description = '', eventIds: string[] = []) => {
        if (!projectId) return false;
        if (!isUnique(name)) {
            showToast(`Topic "${name}" already exists`);
            return false;
        }
        const topic: Topic = {
            id: uuid(),
            name,
            partitions,
            description,
            eventIds,
        };
        storage.createTopic(projectId, topic);
        setTopics([...getTopics(), topic]);
        return true;
    };

    const updateTopic = (id: string, patch: Partial<Topic>) => {
        if (!projectId) return false;
        if (patch.name && !isUnique(patch.name, id)) {
            showToast(`Topic "${patch.name}" already exists`);
            return false;
        }
        storage.updateTopic(projectId, id, patch);
        setTopics(getTopics().map(t => t.id === id ? { ...t, ...patch } : t));
        return true;
    };

    const deleteTopic = (id: string) => {
        if (!projectId) return;
        storage.deleteTopic(projectId, id);
        setTopics(getTopics().filter(t => t.id !== id));
    };

    return { addTopic, updateTopic, deleteTopic, isTopicNameUnique: isUnique };
}
