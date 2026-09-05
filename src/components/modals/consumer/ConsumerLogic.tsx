import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { EventStream, EventType, RoutingRule, RoutingStrategy } from '../../../types';
import { ConsumerDraft, EditConsumer } from './ConsumerConnections';
import ScriptField from './ScriptField';
import RoutingRuleEditor from './RoutingRuleEditor';

export default function ConsumerLogic({ draft, edit, streams, events }: {
    draft: ConsumerDraft; edit: EditConsumer; streams: EventStream[]; events: EventType[];
}) {
    const rules = draft.routingRules ?? [];
    const updateRule = (id: string, patch: Partial<RoutingRule>) => edit({ routingRules: rules.map(r => r.id === id ? { ...r, ...patch } : r) });
    return <Stack spacing={3}>
        <TextField label="Routing strategy" select size="small" value={draft.routingStrategy ?? 'broadcast'} onChange={e => edit({ routingStrategy: e.target.value as RoutingStrategy })}>
            <MenuItem value="broadcast">Broadcast</MenuItem><MenuItem value="conditional">Conditional</MenuItem><MenuItem value="failover">Failover</MenuItem>
        </TextField>
        <ScriptField label="Consumer transformation" value={draft.transformScript ?? ''} onChange={transformScript => edit({ transformScript })} />
        {draft.routingStrategy === 'failover' && <TextField label="Failure probability" type="number" size="small" value={draft.failureRate ?? 0.05}
            onChange={e => edit({ failureRate: Number(e.target.value) })} slotProps={{ htmlInput: { min: 0, max: 1, step: 0.05 } }}
            helperText="0 means always succeed; 1 means always fail. Success uses the first sink; failure uses the DLQ." />}
        {draft.routingStrategy === 'conditional' && <Stack spacing={2}>
            <Typography variant="subtitle2">Routing rules</Typography>
            {rules.map(rule => <RoutingRuleEditor key={rule.id} rule={rule} sources={draft.sources} sinks={draft.sinks} streams={streams} events={events}
                update={patch => updateRule(rule.id, patch)} remove={() => edit({ routingRules: rules.filter(r => r.id !== rule.id) })} />)}
            <Button startIcon={<Plus size={16} />} disabled={!draft.sinks.length} onClick={() => edit({ routingRules: [...rules, { id: uuid(), condition: '', sinkStreamId: draft.sinks[0].streamId }] })}>Add Rule</Button>
            {!draft.sinks.length && <Typography variant="caption" color="text.secondary">Add an outbound sink before creating rules.</Typography>}
        </Stack>}
    </Stack>;
}
