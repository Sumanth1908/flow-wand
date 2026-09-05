import { ConsumerShape, ConsumerType } from '../types';

export const CONSUMER_TYPE_OPTIONS: ReadonlyArray<{ value: ConsumerType; label: string }> = [
    { value: 'default', label: 'Generic Consumer' },
    { value: 'service', label: 'Service' },
    { value: 'api', label: 'API' },
    { value: 'gateway', label: 'Gateway' },
    { value: 'worker', label: 'Worker' },
    { value: 'lambda', label: 'Function / Lambda' },
    { value: 'container', label: 'Container' },
    { value: 'scheduler', label: 'Scheduler' },
    { value: 'database', label: 'Database' },
    { value: 'cache', label: 'Cache' },
];

export const CONSUMER_SHAPE_OPTIONS: ReadonlyArray<{ value: ConsumerShape; label: string }> = [
    { value: 'rounded', label: 'Rounded' },
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'pill', label: 'Pill' },
    { value: 'hexagon', label: 'Hexagon' },
    { value: 'bevel', label: 'Beveled' },
    { value: 'cylinder', label: 'Cylinder' },
];

const DEFAULT_SHAPE_BY_TYPE: Record<ConsumerType, ConsumerShape> = {
    default: 'rounded',
    service: 'rectangle',
    api: 'hexagon',
    gateway: 'hexagon',
    worker: 'bevel',
    lambda: 'pill',
    container: 'rectangle',
    scheduler: 'rounded',
    database: 'cylinder',
    cache: 'cylinder',
};

export const getDefaultConsumerShape = (type: ConsumerType = 'default'): ConsumerShape =>
    DEFAULT_SHAPE_BY_TYPE[type];

export const getConsumerTypeLabel = (type: ConsumerType = 'default'): string =>
    CONSUMER_TYPE_OPTIONS.find(option => option.value === type)?.label ?? 'Generic Consumer';

export const getConsumerShapeLabel = (shape: ConsumerShape): string =>
    CONSUMER_SHAPE_OPTIONS.find(option => option.value === shape)?.label ?? 'Rounded';
