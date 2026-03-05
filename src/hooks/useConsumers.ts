/**
 * hooks/useConsumers.ts
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { Consumer, DataFlow, StreamConnection } from '../types';

export const buildConsumerActions = (
    projectId: string | null,
    getConsumers: () => Consumer[],
    setConsumers: (consumers: Consumer[]) => void,
    getFlows: () => DataFlow[],
    setFlows: (flows: DataFlow[]) => void
) => {
    const addConsumer = (
        name: string,
        description = '',
        sources: StreamConnection[] = [],
        sinks: StreamConnection[] = [],
        routingStrategy: Consumer['routingStrategy'] = 'broadcast',
        failureRate = 0.05,
        transformScript = '',
        routingRules: Consumer['routingRules'] = [],
        type: Consumer['type'] = 'default',
        dlqSink?: import('../types').StreamConnection
    ) => {
        if (!projectId) return false;
        const consumer: Consumer = {
            id: uuid(),
            name,
            description,
            type,
            sources,
            sinks,
            routingStrategy,
            failureRate,
            transformScript,
            routingRules,
            ...(dlqSink ? { dlqSink } : {}),
        };
        storage.createConsumer(projectId, consumer);
        setConsumers([...getConsumers(), consumer]);
        return true;
    };

    const updateConsumer = (id: string, patch: Partial<Consumer>) => {
        if (!projectId) return false;
        storage.updateConsumer(projectId, id, patch);
        setConsumers(getConsumers().map(j => j.id === id ? { ...j, ...patch } : j));
        return true;
    };

    const deleteConsumer = (id: string) => {
        if (!projectId) return;
        storage.deleteConsumer(projectId, id);
        setConsumers(getConsumers().filter(j => j.id !== id));
        // Remove consumer from any flows
        setFlows(getFlows().map(f => ({ ...f, consumerIds: f.consumerIds.filter(x => x !== id) })));
    };

    return { addConsumer, updateConsumer, deleteConsumer };
}
