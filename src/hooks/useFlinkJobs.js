/**
 * hooks/useFlinkJobs.js — Flink job CRUD actions
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';

export function buildFlinkJobActions(projectId, getJobs, setJobs, getFlows, setFlows) {
    const addFlinkJob = (name, sourceTopics = [], sinkTopics = [], description = '') => {
        if (!projectId) return null;
        const job = { id: uuid(), name, sourceTopics, sinkTopics, description, createdAt: new Date().toISOString() };
        storage.createFlinkJob(projectId, job);
        setJobs([...getJobs(), job]);
        return job;
    };

    const updateFlinkJob = (id, patch) => {
        if (!projectId) return;
        storage.updateFlinkJob(projectId, id, patch);
        setJobs(getJobs().map(j => j.id === id ? { ...j, ...patch } : j));
    };

    const deleteFlinkJob = (id) => {
        if (!projectId) return;
        storage.deleteFlinkJob(projectId, id);
        setJobs(getJobs().filter(j => j.id !== id));
        // Remove job from any flows
        setFlows(getFlows().map(f => ({ ...f, jobIds: f.jobIds.filter(x => x !== id) })));
    };

    return { addFlinkJob, updateFlinkJob, deleteFlinkJob };
}
