/**
 * hooks/useEventGeneration.ts
 * Generates fresh new payload schemas based on the events a consumer emits.
 */
import { EventType } from '../types';

export const useEventGeneration = () => {
    const generateEventPayload = (
        currentPayload: any,
        consumerName: string,
        outboundEvents: EventType[]
    ) => {
        const ts = () => new Date().toISOString();
        let payload: any = { _processedBy: consumerName, _processedAt: ts() };

        if (!outboundEvents || outboundEvents.length === 0) {
            // If the consumer doesn't specify any output schemas, we just emit a generic acknowledgment event
            Reflect.set(payload, 'status', 'processed');
            return payload;
        }

        const parsedSchemas = outboundEvents.map(e => {
            if (!e || !e.schema) return {};
            try { return JSON.parse(e.schema); } catch { return {}; }
        });

        if (parsedSchemas.length === 1) {
            payload = { ...payload, ...parsedSchemas[0] };
        } else if (parsedSchemas.length > 1) {
            const mergedSchemas = parsedSchemas.reduce((acc, curr) => ({ ...acc, ...curr }), {});
            payload = { ...payload, ...mergedSchemas };
        }

        return payload;
    };

    return { generateEventPayload };
}
