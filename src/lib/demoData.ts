/**
 * lib/demoData.ts
 * Sample data for the FlowWand demo – an e-commerce order processing pipeline.
 */
import { EventStream, Consumer, DataFlow, EventType } from '../types';

// ── Event Types ──────────────────────────────────────────
const events: EventType[] = [
    {
        id: 'evt-order-placed',
        name: 'OrderPlaced',
        description: 'Fired when a customer submits a new order',
        schema: '{\n  "orderId": "string",\n  "customerId": "string",\n  "items": [{ "sku": "string", "qty": "number", "price": "number" }],\n  "total": "number",\n  "timestamp": "ISO-8601"\n}',
    },
    {
        id: 'evt-payment-processed',
        name: 'PaymentProcessed',
        description: 'Emitted after a payment gateway confirms the charge',
        schema: '{\n  "orderId": "string",\n  "paymentId": "string",\n  "status": "approved | declined",\n  "amount": "number"\n}',
    },
    {
        id: 'evt-inventory-reserved',
        name: 'InventoryReserved',
        description: 'Confirms that stock has been reserved for the order',
        schema: '{\n  "orderId": "string",\n  "warehouseId": "string",\n  "items": [{ "sku": "string", "reserved": "number" }]\n}',
    },
    {
        id: 'evt-shipment-created',
        name: 'ShipmentCreated',
        description: 'A shipping label has been generated',
        schema: '{\n  "orderId": "string",\n  "trackingNumber": "string",\n  "carrier": "string",\n  "estimatedDelivery": "ISO-8601"\n}',
    },
    {
        id: 'evt-notification-sent',
        name: 'NotificationSent',
        description: 'Email / SMS notification dispatched to the customer',
        schema: '{\n  "orderId": "string",\n  "channel": "email | sms | push",\n  "template": "string"\n}',
    },
    {
        id: 'evt-analytics-event',
        name: 'AnalyticsEvent',
        description: 'Enriched event for the analytics data warehouse',
        schema: '{\n  "eventType": "string",\n  "orderId": "string",\n  "metadata": "object",\n  "ingestedAt": "ISO-8601"\n}',
    },
];

// ── Streams ──────────────────────────────────────────────
const streams: EventStream[] = [
    {
        id: 'stream-orders',
        name: 'orders',
        type: 'kafka',
        description: 'Incoming customer orders from the checkout service',
        partitions: 12,
        eventIds: ['evt-order-placed'],
    },
    {
        id: 'stream-payments',
        name: 'payments',
        type: 'kafka',
        description: 'Payment confirmations and declines from the gateway',
        partitions: 6,
        eventIds: ['evt-payment-processed'],
    },
    {
        id: 'stream-inventory',
        name: 'inventory-events',
        type: 'kafka',
        description: 'Warehouse inventory reservation and release events',
        partitions: 8,
        eventIds: ['evt-inventory-reserved'],
    },
    {
        id: 'stream-shipments',
        name: 'shipments',
        type: 'kafka',
        description: 'Shipping updates and tracking information',
        partitions: 4,
        eventIds: ['evt-shipment-created'],
    },
    {
        id: 'stream-notifications',
        name: 'notifications',
        type: 'sns',
        description: 'Fan-out notification topic for email, SMS and push',
        partitions: 1,
        eventIds: ['evt-notification-sent'],
    },
    {
        id: 'stream-analytics',
        name: 'analytics-ingest',
        type: 'kafka',
        description: 'Enriched events for the analytics data lake',
        partitions: 16,
        eventIds: ['evt-analytics-event'],
    },
];

// ── Consumers ────────────────────────────────────────────
const consumers: Consumer[] = [
    {
        id: 'consumer-payment',
        name: 'Payment Processor',
        description: 'Validates and processes payment for incoming orders via Stripe/PayPal',
        sources: [{ streamId: 'stream-orders', eventIds: ['evt-order-placed'] }],
        sinks: [{ streamId: 'stream-payments', eventIds: ['evt-payment-processed'] }],
    },
    {
        id: 'consumer-inventory',
        name: 'Inventory Manager',
        description: 'Reserves stock in the nearest warehouse after payment is confirmed',
        sources: [{ streamId: 'stream-payments', eventIds: ['evt-payment-processed'] }],
        sinks: [{ streamId: 'stream-inventory', eventIds: ['evt-inventory-reserved'] }],
    },
    {
        id: 'consumer-fulfillment',
        name: 'Fulfillment Engine',
        description: 'Creates shipping labels and dispatches to the carrier network',
        sources: [{ streamId: 'stream-inventory', eventIds: ['evt-inventory-reserved'] }],
        sinks: [{ streamId: 'stream-shipments', eventIds: ['evt-shipment-created'] }],
    },
    {
        id: 'consumer-notifier',
        name: 'Notification Service',
        description: 'Sends order confirmation, shipping and delivery notifications',
        sources: [
            { streamId: 'stream-payments', eventIds: ['evt-payment-processed'] },
            { streamId: 'stream-shipments', eventIds: ['evt-shipment-created'] },
        ],
        sinks: [{ streamId: 'stream-notifications', eventIds: ['evt-notification-sent'] }],
    },
    {
        id: 'consumer-analytics',
        name: 'Analytics Enricher',
        description: 'Enriches all domain events with metadata and writes to the data lake',
        sources: [
            { streamId: 'stream-orders', eventIds: ['evt-order-placed'] },
            { streamId: 'stream-payments', eventIds: ['evt-payment-processed'] },
            { streamId: 'stream-shipments', eventIds: ['evt-shipment-created'] },
            { streamId: 'stream-notifications', eventIds: ['evt-notification-sent'] }
        ],
        sinks: [
            { streamId: 'stream-analytics', eventIds: ['evt-analytics-event'] },
            { streamId: 'stream-orders', eventIds: ['evt-order-placed'] }
        ],
    },
];

// ── Flows ────────────────────────────────────────────────
const flows: DataFlow[] = [
    {
        id: 'flow-order-pipeline',
        name: 'Order Processing Pipeline',
        description: 'End-to-end order flow from checkout to shipment',
        color: '#00FA9A',
        consumerIds: ['consumer-payment', 'consumer-inventory', 'consumer-fulfillment'],
    },
    {
        id: 'flow-notification',
        name: 'Notification Fan-out',
        description: 'Multi-channel customer notification pathway',
        color: '#FF007F',
        consumerIds: ['consumer-notifier'],
    },
    {
        id: 'flow-analytics',
        name: 'Analytics Ingestion',
        description: 'Real-time event enrichment for the data warehouse',
        color: '#00FFFF',
        consumerIds: ['consumer-analytics'],
    },
];

export const DEMO_DATA = { streams, consumers, flows, events };
