import { describe, expect, it } from 'vitest';
import { buildSimSteps } from './useSimulation';
import { Consumer, EventStream, EventType, JsonValue } from '../types';

const streams: EventStream[] = [
    { id: 'source', name: 'source', type: 'kafka', description: '', partitions: 1 },
    { id: 'sink', name: 'sink', type: 'kafka', description: '', partitions: 1 },
    { id: 'dlq', name: 'dlq', type: 'sqs', description: '', partitions: 1, isDLQ: true },
];

const events: EventType[] = ['one', 'two', 'failed'].map(id => ({
    id,
    name: id,
    description: '',
    schema: '{"type":"object","properties":{}}',
}));

const generate = (payload: JsonValue) => payload;

describe('buildSimSteps', () => {
    it('routes only to consumers subscribed to the selected event type', () => {
        const consumers: Consumer[] = [
            { id: 'one-consumer', name: 'one', description: '', sources: [{ streamId: 'source', eventIds: ['one'] }], sinks: [] },
            { id: 'two-consumer', name: 'two', description: '', sources: [{ streamId: 'source', eventIds: ['two'] }], sinks: [] },
        ];
        const steps = buildSimSteps('source', streams, consumers, events, [{ value: 1 }], 'one', 1, generate);
        const consumerIds = steps.filter(step => step.type === 'consumer').map(step => step.id);
        expect(consumerIds).toEqual(['one-consumer']);
    });

    it('emits one consumer step with both input and transformed output', () => {
        const consumers: Consumer[] = [{
            id: 'transformer', name: 'transformer', description: '',
            sources: [{ streamId: 'source', eventIds: ['one'] }], sinks: [],
            transformScript: 'payload.changed = true;',
        }];
        const steps = buildSimSteps('source', streams, consumers, events, [{ value: 1 }], 'one', 1, generate);
        const consumerSteps = steps.filter(step => step.type === 'consumer');
        expect(consumerSteps).toHaveLength(1);
        expect(consumerSteps[0].outputPayload).toEqual({ value: 1, changed: true });
    });

    it('honors conditional source events and propagates the output event type', () => {
        const consumers: Consumer[] = [{
            id: 'router', name: 'router', description: '', routingStrategy: 'conditional',
            sources: [{ streamId: 'source', eventIds: ['one', 'two'] }],
            sinks: [{ streamId: 'sink', eventIds: ['two'] }],
            routingRules: [{ id: 'rule', sourceEventId: 'one', condition: 'payload.value === 1', sinkStreamId: 'sink', outputEventId: 'two' }],
        }];
        const steps = buildSimSteps('source', streams, consumers, events, [{ value: 1 }], 'one', 1, generate);
        expect(steps).toContainEqual(expect.objectContaining({ type: 'edge', from: 'router', to: 'sink', eventTypeId: 'two' }));
        expect(steps).toContainEqual(expect.objectContaining({ type: 'stream', id: 'sink', eventTypeId: 'two' }));
    });

    it('uses the explicit DLQ connection on failure', () => {
        const consumers: Consumer[] = [{
            id: 'worker', name: 'worker', description: '', routingStrategy: 'failover', failureRate: 1,
            sources: [{ streamId: 'source', eventIds: ['one'] }],
            sinks: [{ streamId: 'sink', eventIds: ['two'] }],
            dlqSink: { streamId: 'dlq', eventIds: ['failed'] },
        }];
        const steps = buildSimSteps('source', streams, consumers, events, [{}], 'one', 1, generate, { random: () => 0 });
        expect(steps).toContainEqual(expect.objectContaining({ type: 'edge', from: 'worker', to: 'dlq', eventTypeId: 'failed' }));
        expect(steps.some(step => step.type === 'edge' && step.to === 'sink')).toBe(false);
    });

    it('allows a repeated event state up to the configured cycle limit', () => {
        const consumers: Consumer[] = [{
            id: 'loop', name: 'loop', description: '',
            sources: [{ streamId: 'source', eventIds: ['one'] }],
            sinks: [{ streamId: 'source', eventIds: ['one'] }],
        }];
        const steps = buildSimSteps('source', streams, consumers, events, [{}], 'one', 2, generate);
        expect(steps.filter(step => step.type === 'stream' && step.id === 'source')).toHaveLength(2);
        expect(steps).toContainEqual(expect.objectContaining({ type: 'warning', message: expect.stringContaining('Cycle limit reached') }));
    });
});
