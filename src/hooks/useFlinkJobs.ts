/**
 * hooks/useFlinkJobs.ts
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { FlinkJob, DataFlow } from '../types';

export function buildFlinkJobActions(
    projectId: string | null,
    getJobs: () => FlinkJob[],
    setJobs: (jobs: FlinkJob[]) => void,
    getFlows: () => DataFlow[],
    setFlows: (flows: DataFlow[]) => void
) {
    const addFlinkJob = (name: string, description = '', sourceTopics: string[] = [], sinkTopics: string[] = []) => {
        if (!projectId) return false;
        const job: FlinkJob = { id: uuid(), name, sourceTopics, sinkTopics, description };
        storage.createFlinkJob(projectId, job);
        setJobs([...getJobs(), job]);
        return true;
    };

    const updateFlinkJob = (id: string, patch: Partial<FlinkJob>) => {
        if (!projectId) return false;
        storage.updateFlinkJob(projectId, id, patch);
        setJobs(getJobs().map(j => j.id === id ? { ...j, ...patch } : j));
        return true;
    };

    const deleteFlinkJob = (id: string) => {
        if (!projectId) return;
        storage.deleteFlinkJob(projectId, id);
        setJobs(getJobs().filter(j => j.id !== id));
        // Remove job from any flows
        setFlows(getFlows().map(f => ({ ...f, jobIds: f.jobIds.filter(x => x !== id) })));
    };

    return { addFlinkJob, updateFlinkJob, deleteFlinkJob };
}
