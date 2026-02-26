/**
 * hooks/useEventGeneration.ts
 * Generates fresh new payload schemas based on the events a consumer emits.
 */
import { EventType } from '../types';

export const useEventGeneration = () => {
    const generateEventPayload = (
        sourceData: any,
        consumerName: string,
        outboundEvents: EventType[]
    ) => {
        const ts = () => new Date().toISOString();
        const base = { _processedBy: consumerName, _processedAt: ts() };

        if (!outboundEvents || outboundEvents.length === 0) {
            // Return raw data if no schema defined
            return { ...sourceData, ...base };
        }

        // Merge all schemas required for this sink
        const mergedSchema: any = {};
        outboundEvents.forEach(e => {
            if (!e || !e.schema) return;
            try {
                const parsed = JSON.parse(e.schema);
                Object.assign(mergedSchema, parsed);
            } catch { /* ignore invalid schema */ }
        });

        // Fill schema using sourceData
        const result: any = { ...base };
        Object.keys(mergedSchema).forEach(key => {
            if (sourceData && sourceData[key] !== undefined) {
                result[key] = sourceData[key];
            } else {
                // Default value from schema or dummy
                result[key] = mergedSchema[key];
            }
        });

        // Optionally keep processed fields from source if they aren't in schema but look important
        // (like orderId, correlationId, etc)
        const stickyFields = ['orderId', 'id', 'correlationId', 'traceId'];
        stickyFields.forEach(f => {
            if (sourceData[f] && !result[f]) result[f] = sourceData[f];
        });

        return result;
    };

    return { generateEventPayload };
}
