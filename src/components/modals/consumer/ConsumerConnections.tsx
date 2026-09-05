import { Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Consumer, EventStream, EventType, StreamConnection } from '../../../types';
import { CONSUMER_SHAPE_OPTIONS, CONSUMER_TYPE_OPTIONS, getDefaultConsumerShape } from '../../../lib/consumerVisuals';

export type ConsumerDraft = Omit<Consumer, 'id'>;
export type EditConsumer = (patch: Partial<ConsumerDraft>) => void;

function ConnectionPicker({ label, connections, streams, events, onChange, showStreams = true }: {
    label: string; connections: StreamConnection[]; streams: EventStream[]; events: EventType[];
    onChange: (connections: StreamConnection[]) => void; showStreams?: boolean;
}) {
    return <Stack spacing={1}>
        <Typography variant="subtitle2">{label}</Typography>
        {showStreams && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {streams.map(stream => {
                const selected = connections.some(c => c.streamId === stream.id);
                return <Chip key={stream.id} label={stream.name} color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'} size="small"
                    onClick={() => onChange(selected ? connections.filter(c => c.streamId !== stream.id) : [...connections, { streamId: stream.id, eventIds: [] }])} />;
            })}
        </Box>}
        {connections.map(connection => <Box key={connection.streamId} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="caption" fontWeight="bold">{streams.find(s => s.id === connection.streamId)?.name}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {events.map(event => {
                    const selected = connection.eventIds.includes(event.id);
                    return <Chip key={event.id} label={event.name} size="small" variant={selected ? 'filled' : 'outlined'}
                        color={selected ? 'secondary' : 'default'} onClick={() => onChange(connections.map(c => c.streamId === connection.streamId
                            ? { ...c, eventIds: selected ? c.eventIds.filter(id => id !== event.id) : [...c.eventIds, event.id] } : c))} />;
                })}
            </Box>
            <Typography variant="caption" color="text.secondary">Leave events unselected to accept any input event or preserve the output event type.</Typography>
        </Box>)}
    </Stack>;
}

export default function ConsumerConnections({ draft, edit, streams, events }: {
    draft: ConsumerDraft; edit: EditConsumer; streams: EventStream[]; events: EventType[];
}) {
    const normalStreams = streams.filter(s => !s.isDLQ), dlqs = streams.filter(s => s.isDLQ);
    return <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Consumer Name" value={draft.name} onChange={e => edit({ name: e.target.value })} size="small" fullWidth required autoFocus />
            <TextField label="Type" select value={draft.type ?? 'default'} size="small" sx={{ minWidth: 150 }} onChange={e => {
                const type = e.target.value as NonNullable<Consumer['type']>;
                const previous = getDefaultConsumerShape(draft.type ?? 'default');
                edit({ type, shape: !draft.shape || draft.shape === previous ? getDefaultConsumerShape(type) : draft.shape });
            }}>{CONSUMER_TYPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}</TextField>
            <TextField label="Shape" select value={draft.shape ?? getDefaultConsumerShape(draft.type ?? 'default')} size="small" sx={{ minWidth: 140 }}
                onChange={e => edit({ shape: e.target.value as Consumer['shape'] })}>
                {CONSUMER_SHAPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
        </Stack>
        <TextField label="Description" fullWidth size="small" multiline rows={3} value={draft.description} onChange={e => edit({ description: e.target.value })} />
        <ConnectionPicker label="Inbound Sources" connections={draft.sources} streams={streams} events={events} onChange={sources => edit({ sources,
            routingRules: draft.routingRules?.filter(r => !r.sourceStreamId || sources.some(s => s.streamId === r.sourceStreamId)) })} />
        <ConnectionPicker label="Outbound Sinks" connections={draft.sinks} streams={normalStreams} events={events} onChange={sinks => edit({ sinks,
            routingRules: draft.routingRules?.filter(r => sinks.some(s => s.streamId === r.sinkStreamId)) })} />
        <TextField label="Dead-letter queue" select size="small" value={draft.dlqSink?.streamId ?? ''}
            helperText="Used by failover routing when processing fails."
            onChange={e => edit({ dlqSink: e.target.value ? { streamId: e.target.value, eventIds: [] } : undefined })}>
            <MenuItem value="">None</MenuItem>
            {dlqs.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
        {draft.dlqSink && <ConnectionPicker label="DLQ event types" connections={[draft.dlqSink]} streams={dlqs} events={events} showStreams={false}
            onChange={connections => edit({ dlqSink: connections[0] })} />}
    </Stack>;
}
