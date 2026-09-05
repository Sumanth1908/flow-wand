import { Box, Button, Chip, IconButton, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { EventStream, EventType, RoutingRule, StreamConnection } from '../../../types';
import { generateExampleFromSchema, getSchemaFields } from '../../../lib/eventSchema';
import ScriptField from './ScriptField';

export default function RoutingRuleEditor({ rule, update, remove, sources, sinks, streams, events }: {
    rule: RoutingRule; update: (patch: Partial<RoutingRule>) => void; remove: () => void;
    sources: StreamConnection[]; sinks: StreamConnection[]; streams: EventStream[]; events: EventType[];
}) {
    const inputEvent = events.find(e => e.id === rule.sourceEventId);
    const outputEvent = events.find(e => e.id === rule.outputEventId);
    const fields = inputEvent ? getSchemaFields(inputEvent) : [];
    return <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField label="Source stream" select size="small" fullWidth value={rule.sourceStreamId ?? ''} onChange={e => update({ sourceStreamId: e.target.value || undefined })}>
                <MenuItem value="">Any Source</MenuItem>
                {sources.map(s => <MenuItem key={s.streamId} value={s.streamId}>{streams.find(t => t.id === s.streamId)?.name}</MenuItem>)}
            </TextField>
            <TextField label="Source event" select size="small" fullWidth value={rule.sourceEventId ?? ''} onChange={e => update({ sourceEventId: e.target.value || undefined })}>
                <MenuItem value="">Any Event</MenuItem>
                {events.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
            </TextField>
            <IconButton aria-label="Delete routing rule" color="error" onClick={remove}><Trash2 size={18} /></IconButton>
        </Stack>
        <ScriptField condition label="Condition" value={rule.condition} onChange={condition => update({ condition })} />
        {!!fields.length && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {fields.map(field => <Chip key={field} size="small" label={field} onClick={() => update({ condition:
                `${rule.condition ? `(${rule.condition}) && ` : ''}payload[${JSON.stringify(field)}] === ""` })} />)}
        </Box>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField label="Sink stream" select fullWidth size="small" value={rule.sinkStreamId} onChange={e => update({ sinkStreamId: e.target.value })}>
                {sinks.map(s => <MenuItem key={s.streamId} value={s.streamId}>{streams.find(t => t.id === s.streamId)?.name}</MenuItem>)}
            </TextField>
            <TextField label="Output event" select fullWidth size="small" value={rule.outputEventId ?? ''} onChange={e => update({ outputEventId: e.target.value || undefined, eventIds: [] })}>
                <MenuItem value="">Use sink event types</MenuItem>
                {events.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
            </TextField>
        </Stack>
        <ScriptField label="Rule transformation" value={rule.transformScript ?? ''} onChange={transformScript => update({ transformScript })} />
        {outputEvent && <Button size="small" onClick={() => update({ transformScript: `return ${JSON.stringify(generateExampleFromSchema(outputEvent), null, 2)};` })}>
            Use output event example
        </Button>}
        <Typography variant="caption" color="text.secondary">Every matching rule emits an event. Leave the condition empty to always match.</Typography>
    </Stack></Paper>;
}
