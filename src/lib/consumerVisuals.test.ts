import { describe, expect, it } from 'vitest';
import {
    CONSUMER_SHAPE_OPTIONS,
    CONSUMER_TYPE_OPTIONS,
    getConsumerShapeLabel,
    getConsumerTypeLabel,
    getDefaultConsumerShape,
} from './consumerVisuals';

describe('consumer visuals', () => {
    it('provides a default shape for every service type', () => {
        for (const option of CONSUMER_TYPE_OPTIONS) {
            expect(CONSUMER_SHAPE_OPTIONS.some(shape => shape.value === getDefaultConsumerShape(option.value))).toBe(true);
        }
    });

    it('keeps legacy service types visually compatible', () => {
        expect(getDefaultConsumerShape('default')).toBe('rounded');
        expect(getDefaultConsumerShape('lambda')).toBe('pill');
        expect(getDefaultConsumerShape('service')).toBe('rectangle');
        expect(getDefaultConsumerShape('database')).toBe('cylinder');
    });

    it('returns user-facing labels', () => {
        expect(getConsumerTypeLabel('gateway')).toBe('Gateway');
        expect(getConsumerShapeLabel('bevel')).toBe('Beveled');
    });
});
