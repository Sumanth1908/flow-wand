import { describe, expect, it } from 'vitest';
import { generateExampleFromSchema, getSchemaFields, mergePayloadWithEventSchema, normalizeEventSchema } from './eventSchema';
import { EventType } from '../types';

const event: EventType = {
    id: 'created',
    name: 'Created',
    description: '',
    schema: JSON.stringify({
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
            count: { type: 'integer' },
            active: { type: 'boolean' },
        },
        required: ['id'],
    }),
};

describe('event schema helpers', () => {
    it('generates payload fields from JSON Schema properties', () => {
        expect(generateExampleFromSchema(event)).toEqual({
            id: '00000000-0000-4000-8000-000000000000',
            count: 0,
            active: false,
        });
        expect(getSchemaFields(event)).toEqual(['id', 'count', 'active']);
    });

    it('prefers an explicit example payload', () => {
        expect(generateExampleFromSchema({ ...event, examplePayload: '{"id":"example"}' }))
            .toEqual({ id: 'example' });
    });

    it('preserves transformed fields while filling missing schema fields', () => {
        const result = mergePayloadWithEventSchema({ id: 'kept', extra: 42 }, 'worker', [event]);
        expect(result).toMatchObject({ id: 'kept', extra: 42, count: 0, active: false, _processedBy: 'worker' });
    });

    it('migrates legacy example objects into schema plus example payload', () => {
        const migrated = normalizeEventSchema({ ...event, schema: '{"id":"uuid","count":0}' });
        expect(JSON.parse(migrated.schema)).toMatchObject({ type: 'object', properties: { id: { format: 'uuid' }, count: { type: 'integer' } } });
        expect(JSON.parse(migrated.examplePayload || '')).toEqual({ id: 'uuid', count: 0 });
    });
});
