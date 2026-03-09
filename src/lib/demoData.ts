/**
 * lib/demoData.ts
 * MegaShop Platform — Large-scale e-commerce event mesh
 * 12 streams · 30 consumers · 5 flows · 14 event types
 */
import { EventStream, Consumer, DataFlow, EventType } from '../types';

// ── 1. EVENT TYPES ────────────────────────────────────────
const events: EventType[] = [
    {
        id: 'evt-order-placed',
        name: 'OrderPlaced',
        description: 'Customer submits a new order',
        schema: JSON.stringify({ orderId: 'uuid', userId: 'string', items: [{ sku: 'string', qty: 0, price: 0 }], totalAmount: 0, currency: 'string' }, null, 2)
    },
    {
        id: 'evt-order-confirmed',
        name: 'OrderConfirmed',
        description: 'Order validated and accepted for fulfillment',
        schema: JSON.stringify({ orderId: 'uuid', warehouseId: 'string', estimatedShip: 'ISO-8601' }, null, 2)
    },
    {
        id: 'evt-order-cancelled',
        name: 'OrderCancelled',
        description: 'Order was cancelled by user or system',
        schema: JSON.stringify({ orderId: 'uuid', reason: 'string', refundAmount: 0 }, null, 2)
    },
    {
        id: 'evt-payment-initiated',
        name: 'PaymentInitiated',
        description: 'Payment request sent to gateway',
        schema: JSON.stringify({ paymentId: 'uuid', orderId: 'uuid', method: 'string', amount: 0 }, null, 2)
    },
    {
        id: 'evt-payment-success',
        name: 'PaymentSuccess',
        description: 'Payment authorized by gateway',
        schema: JSON.stringify({ paymentId: 'uuid', orderId: 'uuid', authCode: 'string', settledAt: 'ISO-8601' }, null, 2)
    },
    {
        id: 'evt-payment-failed',
        name: 'PaymentFailed',
        description: 'Payment declined or timed out',
        schema: JSON.stringify({ paymentId: 'uuid', orderId: 'uuid', errorCode: 'string', retryable: true }, null, 2)
    },
    {
        id: 'evt-inventory-reserved',
        name: 'InventoryReserved',
        description: 'Stock locked for an order',
        schema: JSON.stringify({ orderId: 'uuid', warehouseId: 'string', items: [{ sku: 'string', qty: 0 }] }, null, 2)
    },
    {
        id: 'evt-inventory-released',
        name: 'InventoryReleased',
        description: 'Stock unlocked due to cancellation or expiry',
        schema: JSON.stringify({ orderId: 'uuid', items: [{ sku: 'string', qty: 0 }] }, null, 2)
    },
    {
        id: 'evt-shipment-dispatched',
        name: 'ShipmentDispatched',
        description: 'Package handed to carrier',
        schema: JSON.stringify({ shipmentId: 'uuid', orderId: 'uuid', carrier: 'string', trackingNumber: 'string', eta: 'ISO-8601' }, null, 2)
    },
    {
        id: 'evt-shipment-delivered',
        name: 'ShipmentDelivered',
        description: 'Package received by customer',
        schema: JSON.stringify({ shipmentId: 'uuid', orderId: 'uuid', deliveredAt: 'ISO-8601', signedBy: 'string' }, null, 2)
    },
    {
        id: 'evt-fraud-flag',
        name: 'FraudFlag',
        description: 'Order or payment flagged as suspicious',
        schema: JSON.stringify({ entityId: 'uuid', entityType: 'order|payment', riskScore: 0, signals: ['string'] }, null, 2)
    },
    {
        id: 'evt-notification',
        name: 'NotificationQueued',
        description: 'User-facing notification ready to dispatch',
        schema: JSON.stringify({ userId: 'string', channel: 'email|sms|push', template: 'string', payload: {} }, null, 2)
    },
    {
        id: 'evt-analytics',
        name: 'AnalyticsEvent',
        description: 'Flattened event for the data warehouse',
        schema: JSON.stringify({ eventName: 'string', userId: 'string', properties: {}, occurredAt: 'ISO-8601' }, null, 2)
    },
    {
        id: 'evt-review-request',
        name: 'ReviewRequested',
        description: 'Trigger for post-delivery review email',
        schema: JSON.stringify({ orderId: 'uuid', userId: 'string', productSkus: ['string'], deliveredAt: 'ISO-8601' }, null, 2)
    },
];

// ── 2. STREAMS ────────────────────────────────────────────
const streams: EventStream[] = [
    { id: 'st-orders', name: 'orders.events.v2', type: 'kafka', description: 'All order lifecycle events', partitions: 32 },
    { id: 'st-payments', name: 'payments.events.v1', type: 'kafka', description: 'Payment gateway results and retries', partitions: 16 },
    { id: 'st-inventory', name: 'inventory.updates.v1', type: 'kafka', description: 'Stock reservation and release events', partitions: 8 },
    { id: 'st-fulfillment', name: 'fulfillment.tasks', type: 'sqs', description: 'Work queue for warehouse picking & packing', partitions: 1 },
    { id: 'st-shipping', name: 'shipping.events.v1', type: 'kafka', description: 'Carrier dispatch and delivery tracking', partitions: 8 },
    { id: 'st-fraud', name: 'fraud.signals.v1', type: 'kafka', description: 'High-risk entity flags for review', partitions: 4 },
    { id: 'st-notifications', name: 'notifications.queue', type: 'sns', description: 'Fan-out notification delivery bus', partitions: 1 },
    { id: 'st-analytics', name: 'analytics.ingest.v3', type: 'kafka', description: 'Enriched event stream for Clickhouse/BigQuery', partitions: 64 },
    { id: 'st-dlq', name: 'platform.dlq', type: 'kafka', description: 'Dead-letter queue for all failed consumers', partitions: 4, isDLQ: true },
    { id: 'st-recommendations', name: 'recommendations.feed', type: 'kafka', description: 'Personalized product recommendation triggers', partitions: 16 },
    { id: 'st-audit', name: 'audit.log.v1', type: 'kafka', description: 'Immutable audit trail for compliance', partitions: 8 },
    { id: 'st-search-index', name: 'search.index.updates', type: 'kafka', description: 'Signals for Elasticsearch re-indexing', partitions: 8 },
];

// ── 3. CONSUMERS ──────────────────────────────────────────
const consumers: Consumer[] = [

    // ── ORDER DOMAIN ──────────────────────────────────────
    {
        id: 'cons-order-validator',
        name: 'Order Validator',
        type: 'service',
        description: 'Validates items, pricing, and user eligibility. Rejects malformed orders.',
        sources: [{ streamId: 'st-orders', eventIds: ['evt-order-placed'] }],
        sinks: [
            { streamId: 'st-orders', eventIds: ['evt-order-confirmed'] },
            { streamId: 'st-orders', eventIds: ['evt-order-cancelled'] },
        ],
        routingStrategy: 'conditional',
    },
    {
        id: 'cons-order-enricher',
        name: 'Order Enricher',
        type: 'lambda',
        description: 'Attaches user profile, loyalty tier, and tax details to the order.',
        sources: [{ streamId: 'st-orders', eventIds: ['evt-order-confirmed'] }],
        sinks: [{ streamId: 'st-payments', eventIds: ['evt-payment-initiated'] }],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-order-cancellation-handler',
        name: 'Cancellation Handler',
        type: 'service',
        description: 'Processes order cancellations, triggers refunds and inventory release.',
        sources: [{ streamId: 'st-orders', eventIds: ['evt-order-cancelled'] }],
        sinks: [
            { streamId: 'st-inventory', eventIds: ['evt-inventory-released'] },
            { streamId: 'st-notifications', eventIds: ['evt-notification'] },
        ],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-order-audit-writer',
        name: 'Order Audit Writer',
        type: 'database',
        description: 'Writes all order state changes to the immutable audit log.',
        sources: [{ streamId: 'st-orders', eventIds: ['evt-order-placed', 'evt-order-confirmed', 'evt-order-cancelled'] }],
        sinks: [{ streamId: 'st-audit', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },

    // ── PAYMENT DOMAIN ────────────────────────────────────
    {
        id: 'cons-payment-gateway',
        name: 'Payment Gateway',
        type: 'service',
        description: 'Routes payment to Stripe, Adyen, or PayPal based on amount and currency.',
        sources: [{ streamId: 'st-payments', eventIds: ['evt-payment-initiated'] }],
        sinks: [
            { streamId: 'st-payments', eventIds: ['evt-payment-success'] },
            { streamId: 'st-payments', eventIds: ['evt-payment-failed'] },
        ],
        routingStrategy: 'conditional',
        failureRate: 0.04,
    },
    {
        id: 'cons-payment-retry',
        name: 'Payment Retry Engine',
        type: 'lambda',
        description: 'Schedules exponential-backoff retries for retryable payment failures.',
        sources: [{ streamId: 'st-payments', eventIds: ['evt-payment-failed'] }],
        sinks: [
            { streamId: 'st-payments', eventIds: ['evt-payment-initiated'] },
        ],
        routingStrategy: 'conditional',
        dlqSink: { streamId: 'st-dlq', eventIds: ['evt-payment-failed'] },
    },
    {
        id: 'cons-payment-success-handler',
        name: 'Payment Success Handler',
        type: 'service',
        description: 'Confirms orders and triggers fulfillment queue on successful payment.',
        sources: [{ streamId: 'st-payments', eventIds: ['evt-payment-success'] }],
        sinks: [
            { streamId: 'st-fulfillment', eventIds: ['evt-order-confirmed'] },
            { streamId: 'st-notifications', eventIds: ['evt-notification'] },
        ],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-payment-fraud-screen',
        name: 'Payment Fraud Screen',
        type: 'lambda',
        description: 'Runs ML scoring on payment signatures. Blocks anomalies before gateway.',
        sources: [{ streamId: 'st-payments', eventIds: ['evt-payment-initiated'] }],
        sinks: [{ streamId: 'st-fraud', eventIds: ['evt-fraud-flag'] }],
        routingStrategy: 'conditional',
    },
    {
        id: 'cons-payment-audit',
        name: 'Payment Audit Logger',
        type: 'database',
        description: 'Records all payment events for PCI-DSS compliance audit trail.',
        sources: [{ streamId: 'st-payments', eventIds: ['evt-payment-initiated', 'evt-payment-success', 'evt-payment-failed'] }],
        sinks: [{ streamId: 'st-audit', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },

    // ── INVENTORY DOMAIN ──────────────────────────────────
    {
        id: 'cons-inventory-reservor',
        name: 'Inventory Reservor',
        type: 'service',
        description: 'Locks stock across warehouses using distributed locks. Failover to nearest warehouse.',
        sources: [{ streamId: 'st-orders', eventIds: ['evt-order-confirmed'] }],
        sinks: [
            { streamId: 'st-inventory', eventIds: ['evt-inventory-reserved'] },
        ],
        routingStrategy: 'failover',
        failureRate: 0.01,
        dlqSink: { streamId: 'st-dlq', eventIds: ['evt-order-confirmed'] },
    },
    {
        id: 'cons-inventory-sync',
        name: 'Inventory Sync',
        type: 'service',
        description: 'Syncs reservation/release events to WMS and ERP systems.',
        sources: [
            { streamId: 'st-inventory', eventIds: ['evt-inventory-reserved'] },
            { streamId: 'st-inventory', eventIds: ['evt-inventory-released'] },
        ],
        sinks: [{ streamId: 'st-search-index', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-low-stock-detector',
        name: 'Low Stock Detector',
        type: 'lambda',
        description: 'Triggers reorder alerts when SKU quantity drops below threshold.',
        sources: [{ streamId: 'st-inventory', eventIds: ['evt-inventory-reserved'] }],
        sinks: [{ streamId: 'st-notifications', eventIds: ['evt-notification'] }],
        routingStrategy: 'conditional',
    },

    // ── FULFILLMENT DOMAIN ────────────────────────────────
    {
        id: 'cons-warehouse-picker',
        name: 'Warehouse Picker',
        type: 'service',
        description: 'Assigns pick-and-pack tasks to warehouse staff based on zone and priority.',
        sources: [{ streamId: 'st-fulfillment', eventIds: ['evt-order-confirmed'] }],
        sinks: [{ streamId: 'st-shipping', eventIds: ['evt-shipment-dispatched'] }],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-label-printer',
        name: 'Shipping Label Printer',
        type: 'lambda',
        description: 'Generates carrier labels via FedEx/UPS/DHL API and uploads PDF.',
        sources: [{ streamId: 'st-fulfillment', eventIds: ['evt-order-confirmed'] }],
        sinks: [{ streamId: 'st-audit', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-fulfillment-sla-monitor',
        name: 'SLA Monitor',
        type: 'service',
        description: 'Monitors warehouse task age. Escalates overdue tasks to operations team.',
        sources: [{ streamId: 'st-fulfillment', eventIds: ['evt-order-confirmed'] }],
        sinks: [{ streamId: 'st-notifications', eventIds: ['evt-notification'] }],
        routingStrategy: 'conditional',
    },

    // ── SHIPPING DOMAIN ───────────────────────────────────
    {
        id: 'cons-tracking-updater',
        name: 'Tracking Updater',
        type: 'service',
        description: 'Polls carrier APIs and emits delivery status updates in real-time.',
        sources: [{ streamId: 'st-shipping', eventIds: ['evt-shipment-dispatched'] }],
        sinks: [
            { streamId: 'st-shipping', eventIds: ['evt-shipment-delivered'] },
            { streamId: 'st-notifications', eventIds: ['evt-notification'] },
        ],
        routingStrategy: 'conditional',
    },
    {
        id: 'cons-delivery-confirmer',
        name: 'Delivery Confirmer',
        type: 'service',
        description: 'Marks orders as complete on delivery. Triggers review request pipeline.',
        sources: [{ streamId: 'st-shipping', eventIds: ['evt-shipment-delivered'] }],
        sinks: [
            { streamId: 'st-orders', eventIds: ['evt-order-confirmed'] },
            { streamId: 'st-notifications', eventIds: ['evt-review-request'] },
        ],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-returns-initiator',
        name: 'Returns Initiator',
        type: 'service',
        description: 'After delivery, opens the return window and creates return-label pre-auth.',
        sources: [{ streamId: 'st-shipping', eventIds: ['evt-shipment-delivered'] }],
        sinks: [{ streamId: 'st-inventory', eventIds: ['evt-inventory-released'] }],
        routingStrategy: 'conditional',
    },

    // ── FRAUD DOMAIN ──────────────────────────────────────
    {
        id: 'cons-fraud-review-router',
        name: 'Fraud Review Router',
        type: 'service',
        description: 'Routes high-risk flags to manual review queue or auto-blocks based on score.',
        sources: [{ streamId: 'st-fraud', eventIds: ['evt-fraud-flag'] }],
        sinks: [
            { streamId: 'st-orders', eventIds: ['evt-order-cancelled'] },
            { streamId: 'st-notifications', eventIds: ['evt-notification'] },
        ],
        routingStrategy: 'conditional',
    },
    {
        id: 'cons-fraud-ml-scorer',
        name: 'Fraud ML Scorer',
        type: 'lambda',
        description: 'Applies real-time gradient-boosting model to enrich fraud signals with risk scores.',
        sources: [{ streamId: 'st-fraud', eventIds: ['evt-fraud-flag'] }],
        sinks: [{ streamId: 'st-audit', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-order-fraud-screen',
        name: 'Order Fraud Screen',
        type: 'lambda',
        description: 'Checks new orders for proxy IPs, velocity abuse, and stolen card signals.',
        sources: [{ streamId: 'st-orders', eventIds: ['evt-order-placed'] }],
        sinks: [{ streamId: 'st-fraud', eventIds: ['evt-fraud-flag'] }],
        routingStrategy: 'conditional',
    },

    // ── NOTIFICATION DOMAIN ───────────────────────────────
    {
        id: 'cons-email-dispatcher',
        name: 'Email Dispatcher',
        type: 'service',
        description: 'Sends transactional emails via SendGrid. Handles templating and unsubscribes.',
        sources: [{ streamId: 'st-notifications', eventIds: ['evt-notification'] }],
        sinks: [{ streamId: 'st-analytics', eventIds: ['evt-analytics'] }],
        routingStrategy: 'conditional',
    },
    {
        id: 'cons-push-dispatcher',
        name: 'Push Notification Dispatcher',
        type: 'lambda',
        description: 'Sends mobile push alerts via FCM and APNs. Handles token refresh failures.',
        sources: [{ streamId: 'st-notifications', eventIds: ['evt-notification'] }],
        sinks: [
            { streamId: 'st-analytics', eventIds: ['evt-analytics'] },
        ],
        routingStrategy: 'failover',
        failureRate: 0.02,
        dlqSink: { streamId: 'st-dlq', eventIds: ['evt-notification'] },
    },
    {
        id: 'cons-review-requester',
        name: 'Review Request Sender',
        type: 'lambda',
        description: 'Sends post-delivery review invitation emails 48h after delivery.',
        sources: [{ streamId: 'st-notifications', eventIds: ['evt-review-request'] }],
        sinks: [{ streamId: 'st-analytics', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },

    // ── ANALYTICS DOMAIN ──────────────────────────────────
    {
        id: 'cons-analytics-ingestor',
        name: 'Analytics Ingestor',
        type: 'database',
        description: 'Writes all normalised events to Clickhouse for real-time dashboards.',
        sources: [{ streamId: 'st-analytics', eventIds: ['evt-analytics'] }],
        sinks: [{ streamId: 'st-audit', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-analytics-bridge',
        name: 'Analytics Bridge',
        type: 'service',
        description: 'Fans out domain events from orders, shipping, and payments into the analytics stream.',
        sources: [
            { streamId: 'st-orders', eventIds: ['evt-order-placed', 'evt-order-confirmed'] },
            { streamId: 'st-shipping', eventIds: ['evt-shipment-dispatched', 'evt-shipment-delivered'] },
            { streamId: 'st-payments', eventIds: ['evt-payment-success'] },
        ],
        sinks: [{ streamId: 'st-analytics', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },

    // ── RECOMMENDATIONS DOMAIN ────────────────────────────
    {
        id: 'cons-reco-trainer',
        name: 'Recommendation Model Trainer',
        type: 'service',
        description: 'Updates collaborative-filtering model with new purchase signals.',
        sources: [{ streamId: 'st-orders', eventIds: ['evt-order-confirmed'] }],
        sinks: [{ streamId: 'st-recommendations', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-reco-dispatcher',
        name: 'Recommendation Dispatcher',
        type: 'lambda',
        description: 'Pushes personalised product feeds to user sessions and email templates.',
        sources: [{ streamId: 'st-recommendations', eventIds: ['evt-analytics'] }],
        sinks: [{ streamId: 'st-notifications', eventIds: ['evt-notification'] }],
        routingStrategy: 'broadcast',
    },

    // ── SEARCH & DLQ ──────────────────────────────────────
    {
        id: 'cons-search-indexer',
        name: 'Search Indexer',
        type: 'service',
        description: 'Re-indexes products and order statuses in Elasticsearch on inventory changes.',
        sources: [{ streamId: 'st-search-index', eventIds: ['evt-analytics'] }],
        sinks: [{ streamId: 'st-analytics', eventIds: ['evt-analytics'] }],
        routingStrategy: 'broadcast',
    },
    {
        id: 'cons-dlq-processor',
        name: 'DLQ Processor',
        type: 'service',
        description: 'Classifies dead-lettered messages. Alerts on-call and attempts safe replay.',
        sources: [{ streamId: 'st-dlq', eventIds: ['evt-payment-failed', 'evt-notification', 'evt-order-confirmed'] }],
        sinks: [{ streamId: 'st-notifications', eventIds: ['evt-notification'] }],
        routingStrategy: 'conditional',
    },
];

// ── 4. FLOWS ──────────────────────────────────────────────
const flows: DataFlow[] = [
    {
        id: 'flow-checkout',
        name: 'Checkout → Fulfillment',
        description: 'End-to-end happy path: order placed → validated → paid → packed → shipped',

        consumerIds: [
            'cons-order-validator', 'cons-order-enricher',
            'cons-payment-gateway', 'cons-payment-success-handler',
            'cons-inventory-reservor', 'cons-warehouse-picker',
            'cons-label-printer', 'cons-tracking-updater',
        ],
    },
    {
        id: 'flow-fraud',
        name: 'Fraud Detection',
        description: 'Order and payment fraud screening pipeline with ML scoring',

        consumerIds: [
            'cons-order-fraud-screen', 'cons-payment-fraud-screen',
            'cons-fraud-ml-scorer', 'cons-fraud-review-router',
        ],
    },
    {
        id: 'flow-notifications',
        name: 'Notification Pipeline',
        description: 'All user-facing notification routing from order events to delivery',

        consumerIds: [
            'cons-payment-success-handler', 'cons-tracking-updater',
            'cons-email-dispatcher', 'cons-push-dispatcher',
            'cons-review-requester', 'cons-reco-dispatcher',
        ],
    },
    {
        id: 'flow-analytics',
        name: 'Analytics & Audit',
        description: 'Full data observability: warehouse ingestion, audit trail, and search indexing',

        consumerIds: [
            'cons-analytics-bridge', 'cons-analytics-ingestor',
            'cons-order-audit-writer', 'cons-payment-audit',
            'cons-fraud-ml-scorer', 'cons-search-indexer',
        ],
    },
    {
        id: 'flow-resilience',
        name: 'Resilience & Recovery',
        description: 'Error handling: payment retries, DLQ processing, SLA monitoring',

        consumerIds: [
            'cons-payment-retry', 'cons-dlq-processor',
            'cons-fulfillment-sla-monitor', 'cons-order-cancellation-handler',
        ],
    },
];

export const DEMO_DATA = { streams, consumers, flows, events };
