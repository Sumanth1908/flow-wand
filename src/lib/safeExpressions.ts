import jsep from 'jsep';
import { JsonValue } from '../types';

const BLOCKED_PROPERTIES = new Set(['__proto__', 'prototype', 'constructor']);
type SafeNode = { type: string; [key: string]: any };

const asRecord = (value: unknown): Record<string, unknown> => {
    if (typeof value !== 'object' || value === null) throw new Error('Expression target is not an object');
    return value as Record<string, unknown>;
};

const evaluateNode = (node: SafeNode, scope: { payload: JsonValue }): unknown => {
    switch (node.type) {
        case 'Literal':
            return node.value;
        case 'Identifier':
            if (node.name === 'payload') return scope.payload;
            throw new Error(`Identifier "${node.name}" is not allowed`);
        case 'ArrayExpression':
            return node.elements.map((element: SafeNode) => evaluateNode(element, scope));
        case 'UnaryExpression': {
            const value = evaluateNode(node.argument, scope);
            if (node.operator === '!') return !value;
            if (node.operator === '-') return -Number(value);
            if (node.operator === '+') return Number(value);
            throw new Error(`Unary operator "${node.operator}" is not allowed`);
        }
        case 'BinaryExpression': {
            const left = evaluateNode(node.left, scope);
            if (node.operator === '&&') return left && evaluateNode(node.right, scope);
            if (node.operator === '||') return left || evaluateNode(node.right, scope);
            if (node.operator === '??') return left ?? evaluateNode(node.right, scope);
            const right = evaluateNode(node.right, scope);
            switch (node.operator) {
                case '==': return left == right; // Intentional support for user-authored expressions.
                case '!=': return left != right;
                case '===': return left === right;
                case '!==': return left !== right;
                case '>': return Number(left) > Number(right);
                case '>=': return Number(left) >= Number(right);
                case '<': return Number(left) < Number(right);
                case '<=': return Number(left) <= Number(right);
                case '+': return typeof left === 'string' || typeof right === 'string' ? `${left ?? ''}${right ?? ''}` : Number(left) + Number(right);
                case '-': return Number(left) - Number(right);
                case '*': return Number(left) * Number(right);
                case '/': return Number(left) / Number(right);
                case '%': return Number(left) % Number(right);
                default: throw new Error(`Binary operator "${node.operator}" is not allowed`);
            }
        }
        case 'LogicalExpression': {
            const left = evaluateNode(node.left, scope);
            if (node.operator === '&&') return left && evaluateNode(node.right, scope);
            if (node.operator === '||') return left || evaluateNode(node.right, scope);
            if (node.operator === '??') return left ?? evaluateNode(node.right, scope);
            throw new Error(`Logical operator "${node.operator}" is not allowed`);
        }
        case 'ConditionalExpression':
            return evaluateNode(node.test, scope)
                ? evaluateNode(node.consequent, scope)
                : evaluateNode(node.alternate, scope);
        case 'MemberExpression': {
            const object = evaluateNode(node.object, scope);
            const property = node.computed
                ? String(evaluateNode(node.property, scope))
                : node.property.type === 'Identifier'
                    ? node.property.name
                    : String(evaluateNode(node.property, scope));
            if (BLOCKED_PROPERTIES.has(property)) throw new Error(`Property "${property}" is not allowed`);
            return asRecord(object)[property];
        }
        default:
            throw new Error(`Expression type "${node.type}" is not allowed`);
    }
};

export const evaluateCondition = (expression: string, payload: JsonValue): boolean => {
    if (!expression.trim()) return true;
    return Boolean(evaluateNode(jsep(expression) as SafeNode, { payload }));
};

const parsePayloadPath = (path: string): string[] => {
    const properties: string[] = [];
    let node = jsep(`payload${path}`) as SafeNode;
    while (node.type === 'MemberExpression') {
        if (node.computed && node.property.type !== 'Literal') throw new Error('Assignment keys must be literal field names');
        const property = String(node.computed ? node.property.value : node.property.name);
        if (BLOCKED_PROPERTIES.has(property)) throw new Error(`Property "${property}" is not allowed`);
        properties.unshift(property);
        node = node.object;
    }
    if (node.type !== 'Identifier' || node.name !== 'payload' || !properties.length) throw new Error('Transform assignments must target payload fields');
    return properties;
};

// Find a statement's assignment operator outside quoted field names and bracket expressions.
const splitAssignment = (statement: string): [string, string] => {
    let quote = '', escaped = false, depth = 0;
    for (let i = 0; i < statement.length; i++) {
        const char = statement[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
        } else if (char === '"' || char === "'") quote = char;
        else if (char === '[') depth++;
        else if (char === ']') depth--;
        else if (char === '=' && !depth && statement[i + 1] !== '=' && !['=', '!', '<', '>'].includes(statement[i - 1])) {
            return [statement.slice(0, i).trim(), statement.slice(i + 1).trim()];
        }
    }
    throw new Error('Only payload field assignments and a final return are allowed');
};

const assignPayloadPath = (payload: JsonValue, path: string, value: unknown) => {
    let target = asRecord(payload);
    const properties = parsePayloadPath(path);
    properties.forEach((property, index) => {
        if (index === properties.length - 1) {
            target[property] = value;
            return;
        }
        const child = target[property];
        if (typeof child !== 'object' || child === null || Array.isArray(child)) target[property] = {};
        target = target[property] as Record<string, unknown>;
    });
};

// Split statements and strip comments without treating characters inside strings as syntax.
const statements = (script: string): string[] => {
    const result: string[] = [];
    let current = '', quote = '', escaped = false, lineComment = false, blockComment = false;
    for (let i = 0; i < script.length; i++) {
        const char = script[i], next = script[i + 1];
        if (lineComment) { if (char === '\n') { lineComment = false; current += '\n'; } continue; }
        if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; current += ' '; } continue; }
        if (quote) {
            current += char;
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
            continue;
        }
        if (char === '"' || char === "'") { quote = char; current += char; }
        else if (char === '/' && next === '/') { lineComment = true; i++; }
        else if (char === '/' && next === '*') { blockComment = true; i++; }
        else if (char === ';') { if (current.trim()) result.push(current.trim()); current = ''; }
        else current += char;
    }
    if (quote) throw new Error('Unclosed string in transformation');
    if (blockComment) throw new Error('Unclosed comment in transformation');
    if (current.trim()) result.push(current.trim());
    return result;
};

const validateNode = (node: SafeNode): void => {
    switch (node.type) {
        case 'Literal': return;
        case 'Identifier':
            if (node.name !== 'payload') throw new Error(`Identifier "${node.name}" is not allowed`);
            return;
        case 'ArrayExpression': node.elements.forEach(validateNode); return;
        case 'UnaryExpression':
            if (!['!', '+', '-'].includes(node.operator)) throw new Error('Unsupported unary operator');
            validateNode(node.argument); return;
        case 'BinaryExpression': case 'LogicalExpression':
            if (!['&&', '||', '??', '==', '!=', '===', '!==', '>', '>=', '<', '<=', '+', '-', '*', '/', '%'].includes(node.operator)) throw new Error('Unsupported binary operator');
            validateNode(node.left); validateNode(node.right); return;
        case 'ConditionalExpression': validateNode(node.test); validateNode(node.consequent); validateNode(node.alternate); return;
        case 'MemberExpression':
            validateNode(node.object);
            if (node.computed) validateNode(node.property);
            if ((!node.computed || node.property.type === 'Literal') && BLOCKED_PROPERTIES.has(String(node.computed ? node.property.value : node.property.name))) throw new Error('Unsafe property access');
            return;
        default: throw new Error(`Expression type "${node.type}" is not allowed`);
    }
};
const parseExpression = (expression: string): SafeNode => {
    const node = jsep(expression) as SafeNode;
    validateNode(node);
    return node;
};
export const validateCondition = (expression: string): void => { if (expression.trim()) parseExpression(expression); };

type TransformStatement = { kind: 'assign'; path: string; expression: SafeNode }
    | { kind: 'return'; expression: SafeNode } | { kind: 'json'; value: JsonValue };
const compileTransform = (script: string): TransformStatement[] => {
    const parts = statements(script);
    return parts.map((statement, index) => {
        if (/^return\b/.test(statement)) {
            if (index !== parts.length - 1) throw new Error('Return must be the final statement');
            const expression = statement.replace(/^return\s*/, '');
            try { return { kind: 'json', value: JSON.parse(expression) as JsonValue }; } catch { /* restricted expression */ }
            return { kind: 'return', expression: parseExpression(expression) };
        }
        const [target, expression] = splitAssignment(statement);
        if (!target.startsWith('payload')) throw new Error('Transform assignments must target payload fields');
        const path = target.slice('payload'.length);
        parsePayloadPath(path);
        return { kind: 'assign', path, expression: parseExpression(expression) };
    });
};
export const validateTransform = (script: string): void => { compileTransform(script); };

const assertJson = (value: unknown, ancestors = new Set<object>()): void => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || ancestors.has(value)) throw new Error('Transformation must produce finite, acyclic JSON values');
    ancestors.add(value);
    Object.values(value).forEach(child => assertJson(child, ancestors));
    ancestors.delete(value);
};
export const applyRestrictedTransform = (script: string | undefined, payload: JsonValue): JsonValue => {
    if (!script?.trim()) return payload;
    const compiled = compileTransform(script);
    const working = structuredClone(payload);
    let result: unknown = working;
    for (const statement of compiled) {
        if (statement.kind === 'assign') assignPayloadPath(working, statement.path, evaluateNode(statement.expression, { payload: working }));
        else result = statement.kind === 'json' ? structuredClone(statement.value) : evaluateNode(statement.expression, { payload: working });
    }
    assertJson(result);
    return result as JsonValue;
};
