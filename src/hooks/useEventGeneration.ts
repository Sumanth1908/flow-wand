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

        // Build result by PRESERVING all current sourceData fields (the result of transformation)
        // while ensuring any REQUIRED fields from the schema are present (with defaults if missing)
        const result: any = { ...sourceData, ...base };
        
        Object.keys(mergedSchema).forEach(key => {
            if (result[key] === undefined) {
                // If it's missing from the source transformation but exists in schema, add the placeholder
                result[key] = mergedSchema[key];
            }
        });


        return result;
    };

    return { generateEventPayload };
}
