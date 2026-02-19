/**
 * hooks/useTopics.js
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';

export function buildTopicActions(projectId, getTopics, setTopics, showToast) {
    const isUnique = (name, excludeId = null) =>
        !getTopics().some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== excludeId);

    const addTopic = (name, partitions = 1, description = '', eventIds = []) => {
        if (!projectId) return null;
        if (!isUnique(name)) { showToast(`Topic "${name}" already exists`); return null; }
        const topic = {
            id: uuid(),
            name,
            partitions,
            description,
            eventIds,
            createdAt: new Date().toISOString()
        };
        storage.createTopic(projectId, topic);
        setTopics([...getTopics(), topic]);
        return topic;
    };

    const updateTopic = (id, patch) => {
        if (!projectId) return false;
        if (patch.name && !isUnique(patch.name, id)) {
            showToast(`Topic "${patch.name}" already exists`); return false;
        }
        storage.updateTopic(projectId, id, patch);
        setTopics(getTopics().map(t => t.id === id ? { ...t, ...patch } : t));
        return true;
    };

    const deleteTopic = (id) => {
        if (!projectId) return;
        storage.deleteTopic(projectId, id);
        setTopics(getTopics().filter(t => t.id !== id));
    };

    return { addTopic, updateTopic, deleteTopic, isTopicNameUnique: isUnique };
}
