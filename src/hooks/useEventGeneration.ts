/**
 * hooks/useEventGeneration.ts
 * Generates fresh new payload schemas based on the events a consumer emits.
 */
import { EventType, JsonValue } from '../types';
import { mergePayloadWithEventSchema } from '../lib/eventSchema';

export const useEventGeneration = () => {
    const generateEventPayload = (
        sourceData: JsonValue,
        consumerName: string,
        outboundEvents: EventType[]
    ) => {
        return mergePayloadWithEventSchema(sourceData, consumerName, outboundEvents);
    };

    return { generateEventPayload };
}
