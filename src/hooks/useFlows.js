/**
 * hooks/useFlows.js — Flow CRUD actions
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';

export function buildFlowActions(projectId, getFlows, setFlows) {
    const addFlow = (name, jobIds = [], description = '', color = '#10b981') => {
        if (!projectId) return null;
        const flow = { id: uuid(), name, jobIds, description, color, createdAt: new Date().toISOString() };
        storage.createFlow(projectId, flow);
        setFlows([...getFlows(), flow]);
        return flow;
    };

    const updateFlow = (id, patch) => {
        if (!projectId) return;
        storage.updateFlow(projectId, id, patch);
        setFlows(getFlows().map(f => f.id === id ? { ...f, ...patch } : f));
    };

    const deleteFlow = (id) => {
        if (!projectId) return;
        storage.deleteFlow(projectId, id);
        setFlows(getFlows().filter(f => f.id !== id));
    };

    return { addFlow, updateFlow, deleteFlow };
}
