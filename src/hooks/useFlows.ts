/**
 * hooks/useFlows.ts
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { DataFlow } from '../types';

export function buildFlowActions(
    projectId: string | null,
    getFlows: () => DataFlow[],
    setFlows: (flows: DataFlow[]) => void
) {
    const addFlow = (name: string, color = '#10b981', jobIds: string[] = [], description = '') => {
        if (!projectId) return;
        const flow: DataFlow = { id: uuid(), name, jobIds, description, color };
        storage.createFlow(projectId, flow);
        setFlows([...getFlows(), flow]);
    };

    const updateFlow = (id: string, patch: Partial<DataFlow>) => {
        if (!projectId) return;
        storage.updateFlow(projectId, id, patch);
        setFlows(getFlows().map(f => f.id === id ? { ...f, ...patch } : f));
    };

    const deleteFlow = (id: string) => {
        if (!projectId) return;
        storage.deleteFlow(projectId, id);
        setFlows(getFlows().filter(f => f.id !== id));
    };

    return { addFlow, updateFlow, deleteFlow };
}
