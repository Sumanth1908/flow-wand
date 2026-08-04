import { EventType, JsonValue } from '../types';

type JsonObject = { [key: string]: JsonValue };

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const schemaFromExample = (value: unknown): Record<string, unknown> => {
    if (Array.isArray(value)) return { type: 'array', items: schemaFromExample(value[0] ?? null) };
    if (isObject(value)) {
        const entries = Object.entries(value);
        return {
            type: 'object',
            properties: Object.fromEntries(entries.map(([key, child]) => [key, schemaFromExample(child)])),
            required: entries.map(([key]) => key),
            additionalProperties: entries.length === 0,
        };
    }
    if (typeof value === 'boolean') return { type: 'boolean' };
    if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
    if (typeof value === 'string') {
        if (value === 'uuid') return { type: 'string', format: 'uuid' };
        if (value === 'ISO-8601') return { type: 'string', format: 'date-time' };
        if (value.includes('|')) return { type: 'string', enum: value.split('|') };
        return { type: 'string' };
    }
    return { type: 'null' };
};

export const normalizeEventSchema = (event: EventType): EventType => {
    try {
        const parsed = JSON.parse(event.schema) as unknown;
        if (!isObject(parsed)) return event;
        const schemaKeywords = ['$schema', '$ref', 'type', 'properties', 'oneOf', 'anyOf', 'allOf', 'enum', 'const'];
        if (Object.keys(parsed).length === 0 || schemaKeywords.some(keyword => keyword in parsed)) return event;
        return {
            ...event,
            schema: JSON.stringify(schemaFromExample(parsed), null, 2),
            examplePayload: event.examplePayload || JSON.stringify(parsed, null, 2),
        };
    } catch {
        return event;
    }
};

export const parseJsonValue = (value: string): JsonValue => JSON.parse(value) as JsonValue;

const sampleForSchema = (schema: unknown, key = 'value'): JsonValue => {
    if (!isObject(schema)) return null;
    if ('const' in schema) return schema.const as JsonValue;
    if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0] as JsonValue;
    if ('default' in schema) return schema.default as JsonValue;
    if ('example' in schema) return schema.example as JsonValue;

    const type = schema.type;
    if (type === 'object' || isObject(schema.properties)) {
        const properties = isObject(schema.properties) ? schema.properties : {};
        return Object.fromEntries(
            Object.entries(properties).map(([property, child]) => [property, sampleForSchema(child, property)])
        ) as JsonObject;
    }
    if (type === 'array') return [sampleForSchema(schema.items, key)];
    if (type === 'integer' || type === 'number') return 0;
    if (type === 'boolean') return false;
    if (type === 'null') return null;
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
    return `<${key}>`;
};

export const generateExampleFromSchema = (event: EventType): JsonValue => {
    if (event.examplePayload?.trim()) {
        try { return parseJsonValue(event.examplePayload); } catch { /* fall back to schema */ }
    }

    try {
        const parsed = JSON.parse(event.schema) as unknown;
        if (isObject(parsed) && (parsed.type === 'object' || isObject(parsed.properties))) {
            return sampleForSchema(parsed);
        }
        // Legacy projects stored an example object in `schema`.
        return parsed as JsonValue;
    } catch {
        return {};
    }
};

export const getSchemaFields = (event: EventType): string[] => {
    try {
        const parsed = JSON.parse(event.schema) as unknown;
        if (!isObject(parsed)) return [];
        if (isObject(parsed.properties)) return Object.keys(parsed.properties);
        return Object.keys(parsed);
    } catch {
        return [];
    }
};

export const mergePayloadWithEventSchema = (
    sourceData: JsonValue,
    consumerName: string,
    outboundEvents: EventType[]
): JsonValue => {
    const source = isObject(sourceData) ? sourceData as JsonObject : { value: sourceData };
    const result: JsonObject = {
        ...source,
        _processedBy: consumerName,
        _processedAt: new Date().toISOString(),
    };

    for (const event of outboundEvents) {
        const example = generateExampleFromSchema(event);
        if (!isObject(example)) continue;
        for (const [key, value] of Object.entries(example)) {
            if (result[key] === undefined) result[key] = value as JsonValue;
        }
    }

    return result;
};
