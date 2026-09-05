import React, { useState } from 'react';
import { Alert, Box, Tab, Tabs } from '@mui/material';
import { GitBranch, Settings2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { Consumer } from '../../types';
import { getDefaultConsumerShape } from '../../lib/consumerVisuals';
import ModalFooter from './ModalFooter';
import ConsumerConnections, { ConsumerDraft } from './consumer/ConsumerConnections';
import ConsumerLogic from './consumer/ConsumerLogic';
import { scriptError } from './consumer/ScriptField';

export default function ConsumerForm({ color }: { color: string }) {
    const editing = useStore(s => s.editingItem) as Consumer | null;
    const streams = useStore(s => s.streams), events = useStore(s => s.events);
    const addConsumer = useStore(s => s.addConsumer), updateConsumer = useStore(s => s.updateConsumer), closeModal = useStore(s => s.closeModal);
    const [tab, setTab] = useState(0);
    const [error, setError] = useState('');
    const [draft, setDraft] = useState<ConsumerDraft>(() => ({
        name: '', description: '', sources: [], routingStrategy: 'broadcast', failureRate: 0.05, transformScript: '', routingRules: [],
        ...editing, type: editing?.type ?? 'default', shape: editing?.shape ?? getDefaultConsumerShape(editing?.type ?? 'default'),
        sinks: (editing?.sinks ?? []).filter(c => !streams.find(s => s.id === c.streamId)?.isDLQ),
    }));
    const edit = (patch: Partial<ConsumerDraft>) => setDraft(current => ({ ...current, ...patch }));
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!draft.name.trim()) { setError('Consumer name is required.'); setTab(0); return; }
        const errors = [scriptError(draft.transformScript ?? ''), ...(draft.routingStrategy === 'conditional'
            ? (draft.routingRules ?? []).flatMap(r => [scriptError(r.condition, true), scriptError(r.transformScript ?? '')]) : [])].filter(Boolean);
        if (errors.length) { setError(errors[0]); setTab(1); return; }
        const input = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
        if (editing ? updateConsumer(editing.id, input) : addConsumer(input)) closeModal();
    };
    return <Box component="form" onSubmit={submit}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="1. Connections" icon={<Settings2 size={16} />} iconPosition="start" />
            <Tab label="2. Logic & Mapping" icon={<GitBranch size={16} />} iconPosition="start" />
        </Tabs>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ minHeight: 420 }}>
            {tab === 0 ? <ConsumerConnections draft={draft} edit={edit} streams={streams} events={events} />
                : <ConsumerLogic draft={draft} edit={edit} streams={streams} events={events} />}
        </Box>
        <ModalFooter color={color} isEditing={!!editing} />
    </Box>;
}
