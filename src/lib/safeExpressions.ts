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
    const matcher = /\.([A-Za-z_$][\w$]*)|\[['"]([^'"]+)['"]\]/g;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(path))) {
        const property = match[1] || match[2];
        if (BLOCKED_PROPERTIES.has(property)) throw new Error(`Property "${property}" is not allowed`);
        properties.push(property);
    }
    if (properties.length === 0) throw new Error('Transform assignments must target payload fields');
    return properties;
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

export const applyRestrictedTransform = (script: string | undefined, payload: JsonValue): JsonValue => {
    if (!script?.trim()) return payload;
    const clean = script.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').trim();
    if (!clean) return payload;
    const working = structuredClone(payload);
    const returnMatch = clean.match(/\breturn\s+([\s\S]+?);?\s*$/);
    const assignments = returnMatch ? clean.slice(0, returnMatch.index).trim() : clean;

    for (const statement of assignments.split(';').map(value => value.trim()).filter(Boolean)) {
        const match = statement.match(/^payload((?:\.[A-Za-z_$][\w$]*|\[['"][^'"]+['"]\])+?)\s*=\s*([\s\S]+)$/);
        if (!match) throw new Error('Only payload field assignments and a final return are allowed');
        const value = evaluateNode(jsep(match[2]) as SafeNode, { payload: working });
        assignPayloadPath(working, match[1], value);
    }

    if (!returnMatch || returnMatch[1].trim() === 'payload') return working;
    const returnExpression = returnMatch[1].trim().replace(/;$/, '').trim();
    try {
        return JSON.parse(returnExpression) as JsonValue;
    } catch {
        return evaluateNode(jsep(returnExpression) as SafeNode, { payload: working }) as JsonValue;
    }
};
