import { describe, expect, it } from 'vitest';
import { applyRestrictedTransform, validateCondition, validateTransform } from './safeExpressions';

describe('transformation grammar', () => {
    it('preserves URLs, semicolons, comment markers and return words inside strings', () => {
        const result = applyRestrictedTransform(`
            // Actual comment
            payload.url = "https://example.com/a;b";
            payload.message = "return payload; /* keep */ // keep";
            /* Actual comment */ return payload;
        `, {});
        expect(result).toEqual({ url: 'https://example.com/a;b', message: 'return payload; /* keep */ // keep' });
    });
    it('handles escaped quotes and quoted keys', () => {
        expect(applyRestrictedTransform(String.raw`payload['display name'] = "say \"hello;\""; return payload;`, {}))
            .toEqual({ 'display name': 'say "hello;"' });
    });
    it('accepts JSON returns and validates without requiring a sample payload', () => {
        expect(() => validateTransform('payload.result = payload.nested.amount * 2; return payload;')).not.toThrow();
        expect(applyRestrictedTransform('return {"url":"https://example.com","text":"a;b"};', {}))
            .toEqual({ url: 'https://example.com', text: 'a;b' });
        expect(() => validateCondition('payload.nested.amount > 10')).not.toThrow();
    });
    it.each([
        'payload.x = window.location;', 'payload.x = payload.constructor;',
        'payload.__proto__.x = 1;', 'payload.x = payload.fn();', 'return payload; payload.x = 1;',
        'payload.x = "unterminated;', '/* unterminated',
    ])('rejects unsupported syntax: %s', script => expect(() => validateTransform(script)).toThrow());
    it.each(['payload.x = 1 / 0;', 'payload.x = payload;', 'return payload.missing;'])('rejects non-JSON output: %s', script => {
        expect(() => applyRestrictedTransform(script, {})).toThrow();
    });
    it('does not mutate input', () => {
        const payload = { nested: { value: 1 } };
        applyRestrictedTransform('payload.nested.value = 2;', payload);
        expect(payload.nested.value).toBe(1);
    });
});

it('handles quotes, equals signs and semicolons in assignment keys', () => {
    expect(applyRestrictedTransform(`payload["customer's;name=1"] = 'ready'; return payload;`, {}))
        .toEqual({ "customer's;name=1": 'ready' });
});
