/**
 * lib/demoData.ts
 * Robust Financial Transaction Hub - Real-world Architecture Demo
 */
import { EventStream, Consumer, DataFlow, EventType } from '../types';

// ── 1. REAL-WORLD EVENT SCHEMAS ──────────────────────────
const events: EventType[] = [
    {
        id: 'evt-tx-initiated',
        name: 'TransactionInitiated',
        description: 'Primary ingress event from APIs/Mobile/POS',
        schema: JSON.stringify({
            txId: "uuid",
            userId: "string",
            amount: 0,
            currency: "USD/EUR/GBP",
            merchant: { name: "string", category: "string" },
            metadata: { device: "string", ip: "string", location: "string" }
        }, null, 2)
    },
    {
        id: 'evt-fraud-alert',
        name: 'FraudAlert',
        description: 'Captured high-risk transaction for manual review',
        schema: JSON.stringify({
            txId: "uuid",
            riskScore: "0.0-1.0",
            reasons: ["string"],
            blocked: true,
            detectedAt: "ISO-8601"
        }, null, 2)
    },
    {
        id: 'evt-tx-authorized',
        name: 'TransactionAuthorized',
        description: 'Verified and funds-held transaction',
        schema: JSON.stringify({
            txId: "uuid",
            authCode: "string",
            traceId: "string",
            accountLast4: "string"
        }, null, 2)
    },
    {
        id: 'evt-settlement-task',
        name: 'SettlementTask',
        description: 'Background task for clearing and settlement',
        schema: JSON.stringify({
            txId: "uuid",
            settlementBatch: "string",
            payoutCurrency: "string",
            netAmount: 0
        }, null, 2)
    },
    {
        id: 'evt-analytics-entry',
        name: 'AnalyticsEntry',
        description: 'Flattened data for the analytics warehouse',
        schema: JSON.stringify({
            event_type: "string",
            user_id: "string",
            volume_usd: 0,
            merchant_cat: "string",
            processed_at: "timestamp"
        }, null, 2)
    }
];

// ── 2. SCALABLE INFRASTRUCTURE (STREAMS) ─────────────────
const streams: EventStream[] = [
    { id: 'st-ingress', name: 'tx.ingress.v1', type: 'kafka', description: 'Raw transaction ingress from global gateways', partitions: 32 },
    { id: 'st-fraud', name: 'tx.fraud.alerts', type: 'kafka', description: 'High-risk events for investigation', partitions: 8 },
    { id: 'st-authorized', name: 'tx.authorized', type: 'kafka', description: 'Pre-cleared transactions ready for settlement', partitions: 16 },
    { id: 'st-settlement', name: 'settlement.queue', type: 'sqs', description: 'Batch processing queue for payouts', partitions: 1 },
    { id: 'st-analytics', name: 'data.lake.ingest', type: 'kafka', description: 'Enriched analytics stream (Clickhouse/BigQuery)', partitions: 64 },
    { id: 'st-error-dlq', name: 'tx.authorization.dlq', type: 'kafka', description: 'Dead Letter Queue for failed auth logic', partitions: 4 }
];

// ── 3. COMPLEX LOGIC & ROUTING (CONSUMERS) ───────────────
const consumers: Consumer[] = [
    {
        id: 'cons-fraud-engine',
        name: 'Real-time Fraud Guard',
        description: 'Analyzes volume, location, and velocity. Filters high-risk transactions.',
        sources: [{ streamId: 'st-ingress', eventIds: ['evt-tx-initiated'] }],
        sinks: [
            { streamId: 'st-fraud', eventIds: ['evt-fraud-alert'] },
            { streamId: 'st-authorized', eventIds: ['evt-tx-authorized'] }
        ],
        routingStrategy: 'conditional',
        routingRules: [
            {
                id: 'rule-fraud-high-value',
                condition: 'payload.amount > 5000',
                sinkStreamId: 'st-fraud',
                outputEventId: 'evt-fraud-alert',
                transformScript: '// Route to Fraud Team\nreturn {\n  txId: payload.txId,\n  riskScore: 0.95,\n  reasons: ["High transaction value threshold exceeded"],\n  blocked: true,\n  detectedAt: new Date().toISOString()\n};'
            },
            {
                id: 'rule-fraud-geo',
                condition: 'payload.metadata.location === "Unknown"',
                sinkStreamId: 'st-fraud',
                outputEventId: 'evt-fraud-alert',
                transformScript: 'return {\n  txId: payload.txId,\n  riskScore: 0.8,\n  reasons: ["Geographic anomaly detected"],\n  blocked: true,\n  detectedAt: new Date().toISOString()\n};'
            },
            {
                id: 'rule-safe-pass',
                condition: 'true',
                sinkStreamId: 'st-authorized',
                outputEventId: 'evt-tx-authorized',
                transformScript: '// Normal processing path\nreturn {\n  txId: payload.txId,\n  authCode: "AUTH-" + Math.random().toString(36).substring(7).toUpperCase(),\n  traceId: "TRC-" + Date.now(),\n  accountLast4: "****"\n};'
            }
        ],
        transformScript: '// Global security enrichment\npayload.securityContext = "standard-vpc";\nreturn payload;'
    },
    {
        id: 'cons-settlement',
        name: 'Settlement Orchestrator',
        description: 'Prepares transactions for clearing. Uses Failover for high reliability.',
        sources: [{ streamId: 'st-authorized', eventIds: ['evt-tx-authorized'] }],
        sinks: [
            { streamId: 'st-settlement', eventIds: ['evt-settlement-task'] },
            { streamId: 'st-error-dlq', eventIds: ['evt-tx-authorized'] }
        ],
        routingStrategy: 'failover',
        failureRate: 0.02,
        transformScript: '// Map to settlement schema\nreturn {\n  txId: payload.txId,\n  settlementBatch: "B-" + new Date().toISOString().split("T")[0],\n  payoutCurrency: "USD",\n  netAmount: 0 // Will be calculated by clearing service\n};'
    },
    {
        id: 'cons-analytics-bridge',
        name: 'Analytics Flattener',
        description: 'Flattens domain events into a star-schema format for analytical queries.',
        sources: [
            { streamId: 'st-ingress', eventIds: ['evt-tx-initiated'] },
            { streamId: 'st-authorized', eventIds: ['evt-tx-authorized'] },
            { streamId: 'st-fraud', eventIds: ['evt-fraud-alert'] }
        ],
        sinks: [{ streamId: 'st-analytics', eventIds: ['evt-analytics-entry'] }],
        routingStrategy: 'conditional',
        routingRules: [
            {
                id: 'rule-analytics-flat',
                condition: 'true',
                sinkStreamId: 'st-analytics',
                outputEventId: 'evt-analytics-entry',
                transformScript: 'return {\n  event_type: "financial_event",\n  user_id: payload.userId || "anonymous",\n  volume_usd: payload.amount || 0,\n  merchant_cat: payload.merchant?.category || "N/A",\n  processed_at: new Date().toISOString()\n};'
            }
        ]
    }
];

// ── 4. OPERATIONAL VIEW (FLOWS) ──────────────────────────
const flows: DataFlow[] = [
    {
        id: 'flow-auth-critical',
        name: 'Auth Path (Critical)',
        description: 'End-to-end authorization and settlement path for low-risk transactions',
        color: '#22c55e',
        consumerIds: ['cons-fraud-engine', 'cons-settlement']
    },
    {
        id: 'flow-fraud-path',
        name: 'Fraud Monitoring',
        description: 'Tracing filtered high-risk events to the investigations stream',
        color: '#ef4444',
        consumerIds: ['cons-fraud-engine']
    },
    {
        id: 'flow-data-ops',
        name: 'Data Operations',
        description: 'Analytics observability across all event types',
        color: '#3b82f6',
        consumerIds: ['cons-analytics-bridge']
    }
];

export const DEMO_DATA = { streams, consumers, flows, events };
