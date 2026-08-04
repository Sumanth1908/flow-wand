import { describe, expect, it } from 'vitest';
import { applyRestrictedTransform, evaluateCondition } from './safeExpressions';

describe('restricted expressions', () => {
    it('evaluates payload comparisons and boolean logic', () => {
        expect(evaluateCondition('payload.amount > 10 && payload.status === "ready"', { amount: 12, status: 'ready' })).toBe(true);
    });

    it('applies field assignments without exposing browser globals', () => {
        expect(applyRestrictedTransform('payload.status = "processed"; payload.total = payload.amount * 2; return payload;', { amount: 4 }))
            .toEqual({ amount: 4, status: 'processed', total: 8 });
        expect(() => evaluateCondition('globalThis.fetch("https://example.com")', {})).toThrow();
        expect(() => evaluateCondition('payload.constructor.constructor("return globalThis")()', {})).toThrow();
    });
});
