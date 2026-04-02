/**
 * components/modals/ConsumerForm.tsx
 */
import React, { useState } from 'react';
import { Plus, Trash2, Code2, GitBranch, Settings2 } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { Consumer, StreamConnection, RoutingStrategy, RoutingRule, EventStream } from '../../types';
import {
    Stack, TextField, Typography, Box, Chip, Select, MenuItem,
    Slider, Tabs, Tab, Button, IconButton, Paper
} from '@mui/material';
import { v4 as uuid } from 'uuid';

interface ConsumerFormProps {
    color: string;
}

const ConsumerForm: React.FC<ConsumerFormProps> = ({ color }) => {
    const editingItem = useStore(s => s.editingItem) as Consumer | null;
    const closeModal = useStore(s => s.closeModal);
    const allStreams = useStore(s => s.streams);
    const streams = allStreams.filter((s: EventStream) => !s.isDLQ);
    const dlqStreams = allStreams.filter((s: EventStream) => s.isDLQ);
    const events = useStore(s => s.events);
    const addConsumer = useStore(s => s.addConsumer);
    const updateConsumer = useStore(s => s.updateConsumer);

    const [tab, setTab] = useState(0);

    // General State
    const [name, setName] = useState(editingItem?.name || '');
    const [desc, setDesc] = useState(editingItem?.description || '');
    const [consumerType, setConsumerType] = useState<Consumer['type']>(editingItem?.type || 'default');

    // Connection State — strip any DLQ stream IDs from sinks on load (legacy / old-format data)
    const dlqStreamIds = new Set(dlqStreams.map(s => s.id));
    const [sources, setSources] = useState<StreamConnection[]>(editingItem?.sources || []);
    const [sinks, setSinks] = useState<StreamConnection[]>(
        (editingItem?.sinks || []).filter(c => !dlqStreamIds.has(c.streamId))
    );

    // Logic State
    const [routingStrategy, setRoutingStrategy] = useState<RoutingStrategy>(editingItem?.routingStrategy || 'broadcast');
    const [failureRate, setFailureRate] = useState(editingItem?.failureRate !== undefined ? editingItem.failureRate : 0.05);
    const [transformScript, setTransformScript] = useState(editingItem?.transformScript || '// Modify payload here\n// payload.status = "processed";\n// return payload;');
    const [routingRules, setRoutingRules] = useState<RoutingRule[]>(editingItem?.routingRules || []);
    const [visibleRuleScripts, setVisibleRuleScripts] = useState<Record<string, boolean>>({});
    const [dlqSink, setDlqSink] = useState<StreamConnection | undefined>(editingItem?.dlqSink);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const payload: Partial<Consumer> = {
            name: name.trim(),
            description: desc.trim(),
            type: consumerType,
            sources,
            sinks,
            routingStrategy,
            failureRate,
            transformScript,
            routingRules,
            dlqSink: dlqSink || undefined,
        };

        if (editingItem) {
            updateConsumer(editingItem.id, payload);
        } else {
            addConsumer(
                payload.name as string,
                payload.description,
                payload.sources,
                payload.sinks,
                payload.routingStrategy,
                payload.failureRate,
                payload.transformScript,
                payload.routingRules,
                payload.type,
                payload.dlqSink
            );
        }
        closeModal();
    };

    const toggleStream = (connList: StreamConnection[], streamId: string) => {
        const exists = connList.find(c => c.streamId === streamId);
        if (exists) {
            return connList.filter(c => c.streamId !== streamId);
        } else {
            return [...connList, { streamId, eventIds: [] }];
        }
    };

    const toggleEventOnStream = (connList: StreamConnection[], streamId: string, eventId: string) => {
        return connList.map(c => {
            if (c.streamId === streamId) {
                const hasEvent = c.eventIds.includes(eventId);
                return {
                    ...c,
                    eventIds: hasEvent ? c.eventIds.filter(id => id !== eventId) : [...c.eventIds, eventId]
                };
            }
            return c;
        });
    };

    const addRule = () => {
        if (sinks.length === 0) return;
        setRoutingRules([...routingRules, { id: uuid(), condition: 'payload.val > 0', sinkStreamId: sinks[0].streamId }]);
    };

    const updateRule = (id: string, patch: Partial<RoutingRule>) => {
        setRoutingRules(routingRules.map(r => r.id === id ? { ...r, ...patch } : r));
    };

    const deleteRule = (id: string) => {
        setRoutingRules(routingRules.filter(r => r.id !== id));
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
                textColor="inherit"
                TabIndicatorProps={{ sx: { bgcolor: color } }}
            >
                <Tab label="1. Connections" icon={<Settings2 size={16} />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
                <Tab label="2. Logic & Mapping" icon={<GitBranch size={16} />} iconPosition="start" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            </Tabs>

            <Box sx={{ minHeight: 420 }}>
                {tab === 0 && (
                    <Stack spacing={3}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Consumer Name" fullWidth size="small" autoFocus
                                value={name} onChange={e => setName(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ flex: 2 }}
                            />
                            <TextField
                                label="Type"
                                select
                                size="small"
                                value={consumerType}
                                onChange={e => setConsumerType(e.target.value as Consumer['type'])}
                                sx={{ flex: 1, minWidth: 150 }}
                            >
                                <MenuItem value="default">Default</MenuItem>
                                <MenuItem value="lambda">Lambda</MenuItem>
                                <MenuItem value="service">Service</MenuItem>
                                <MenuItem value="database">Database</MenuItem>
                            </TextField>
                        </Stack>

                        <TextField
                            label="Description" fullWidth size="small" multiline rows={3}
                            value={desc} onChange={e => setDesc(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Describe how this consumer processes events..."
                        />


                        <Stack direction="row" spacing={3}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" fontWeight="900" sx={{ mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>Inbound Sources</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                    {streams.map(s => {
                                        const active = sources.some(c => c.streamId === s.id);
                                        return (
                                            <Chip
                                                key={s.id} label={s.name} size="small" variant={active ? 'filled' : 'outlined'}
                                                color={active ? 'primary' : 'default'} onClick={() => setSources(toggleStream(sources, s.id))}
                                            />
                                        );
                                    })}
                                </Box>
                                <Stack spacing={1}>
                                    {sources.map(conn => (
                                        <Paper key={conn.streamId} variant="outlined" sx={{ p: 1, bgcolor: 'action.hover' }}>
                                            <Typography variant="caption" fontWeight="bold" display="block">{streams.find(s => s.id === conn.streamId)?.name}</Typography>
                                            <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {events.map(ev => {
                                                    const sel = conn.eventIds.includes(ev.id);
                                                    return (
                                                        <Chip
                                                            key={ev.id} label={ev.name} size="small"
                                                            onClick={() => setSources(toggleEventOnStream(sources, conn.streamId, ev.id))}
                                                            sx={{ height: 18, fontSize: 9, bgcolor: sel ? 'primary.main' : 'background.paper', color: sel ? 'white' : 'text.secondary' }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>

                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" fontWeight="900" sx={{ mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>Outbound Sinks</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                    {streams.map(s => {
                                        const active = sinks.some(c => c.streamId === s.id);
                                        return (
                                            <Chip
                                                key={s.id} label={s.name} size="small" variant={active ? 'filled' : 'outlined'}
                                                color={active ? 'secondary' : 'default'} onClick={() => setSinks(toggleStream(sinks, s.id))}
                                            />
                                        );
                                    })}
                                </Box>
                                <Stack spacing={1}>
                                    {sinks
                                        // Skip any lingering DLQ entries — they have no normal stream record
                                        .filter(conn => !dlqStreamIds.has(conn.streamId))
                                        .map(conn => (
                                            <Paper key={conn.streamId} variant="outlined" sx={{ p: 1 }}>
                                                <Typography variant="caption" fontWeight="bold" display="block">{streams.find(s => s.id === conn.streamId)?.name}</Typography>
                                                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {events.map(ev => {
                                                        const sel = conn.eventIds.includes(ev.id);
                                                        return (
                                                            <Chip
                                                                key={ev.id} label={ev.name} size="small"
                                                                onClick={() => setSinks(toggleEventOnStream(sinks, conn.streamId, ev.id))}
                                                                sx={{ height: 18, fontSize: 9, bgcolor: sel ? 'secondary.main' : 'background.paper', color: sel ? 'white' : 'text.secondary' }}
                                                            />
                                                        );
                                                    })}
                                                </Box>
                                            </Paper>
                                        ))}
                                </Stack>
                            </Box>
                        </Stack>

                        {/* DLQ Sink Row */}
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                border: 1,
                                borderColor: dlqSink ? 'error.main' : 'divider',
                                bgcolor: dlqSink ? 'rgba(239,68,68,0.04)' : 'transparent',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Stack spacing={1.5}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Box sx={{ flexShrink: 0 }}>
                                        <Typography variant="caption" fontWeight="900" sx={{ display: 'block', color: 'error.main', textTransform: 'uppercase', mb: 0.3 }}>
                                            ☠&nbsp; DLQ / Failure Sink
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                            Route failed messages here
                                        </Typography>
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        {dlqStreams.length === 0 ? (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                No DLQ streams — create one from the Streams panel.
                                            </Typography>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {dlqStreams.map(s => {
                                                    const active = dlqSink?.streamId === s.id;
                                                    return (
                                                        <Chip
                                                            key={s.id}
                                                            label={`☠ ${s.name}`}
                                                            size="small"
                                                            variant={active ? 'filled' : 'outlined'}
                                                            onClick={() => setDlqSink(active ? undefined : { streamId: s.id, eventIds: [] })}
                                                            sx={{
                                                                borderColor: 'error.main',
                                                                color: active ? 'white' : 'error.main',
                                                                bgcolor: active ? 'error.main' : 'transparent',
                                                                fontWeight: 700,
                                                                '&:hover': { bgcolor: active ? 'error.dark' : 'rgba(239,68,68,0.1)' },
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        )}
                                    </Box>
                                </Stack>

                                {/* Event mapping — only shown once a DLQ stream is selected */}
                                {dlqSink && (
                                    <Box sx={{ pl: 0.5 }}>
                                        <Typography variant="caption" fontWeight="700" sx={{ display: 'block', color: 'error.main', mb: 0.75, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Event Types → DLQ
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {events.length === 0 ? (
                                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>No event types defined yet.</Typography>
                                            ) : events.map(ev => {
                                                const sel = dlqSink.eventIds.includes(ev.id);
                                                return (
                                                    <Chip
                                                        key={ev.id}
                                                        label={ev.name}
                                                        size="small"
                                                        onClick={() => setDlqSink(prev => {
                                                            if (!prev) return prev;
                                                            const has = prev.eventIds.includes(ev.id);
                                                            return {
                                                                ...prev,
                                                                eventIds: has
                                                                    ? prev.eventIds.filter(id => id !== ev.id)
                                                                    : [...prev.eventIds, ev.id],
                                                            };
                                                        })}
                                                        sx={{
                                                            height: 20,
                                                            fontSize: 10,
                                                            bgcolor: sel ? 'error.main' : 'background.paper',
                                                            color: sel ? 'white' : 'text.secondary',
                                                            borderColor: sel ? 'error.main' : 'divider',
                                                            border: 1,
                                                            '&:hover': { bgcolor: sel ? 'error.dark' : 'rgba(239,68,68,0.08)' },
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                )}



                {tab === 1 && (
                    <Stack spacing={2.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="caption" fontWeight="900" sx={{ display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>Routing Strategy</Typography>
                                <Select
                                    size="small" value={routingStrategy}
                                    onChange={e => setRoutingStrategy(e.target.value as RoutingStrategy)}
                                    sx={{ height: 36, fontSize: 13, minWidth: 200, mt: 0.5 }}
                                >
                                    <MenuItem value="broadcast">Broadcast (Fan-out to all)</MenuItem>
                                    <MenuItem value="conditional">Conditional (Decision Table)</MenuItem>
                                    <MenuItem value="failover">Failover (DLQ Simulation)</MenuItem>
                                </Select>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                {routingStrategy === 'failover' && (
                                    <Box sx={{ width: 140 }}>
                                        <Typography variant="caption" fontWeight="bold">Failure Rate: {(failureRate * 100).toFixed(0)}%</Typography>
                                        <Slider value={failureRate} size="small" min={0} max={0.5} step={0.01} onChange={(_, v) => setFailureRate(v as number)} />
                                    </Box>
                                )}

                                <Button
                                    size="small" variant="outlined" startIcon={<Code2 size={16} />}
                                    onClick={() => setVisibleRuleScripts(prev => ({ ...prev, global: !prev.global }))}
                                    color={transformScript ? 'primary' : 'inherit'}
                                    sx={{ height: 36, textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    {transformScript ? 'Global Script Active' : 'Pre-processing'}
                                </Button>
                            </Box>
                        </Box>

                        {visibleRuleScripts['global'] && (
                            <Box sx={{ p: 2, border: 1, borderColor: 'primary.light', borderRadius: 3, bgcolor: 'rgba(25, 118, 210, 0.02)' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                    <Typography variant="caption" fontWeight="bold" color="primary.main">GLOBAL TRANSFORMATION (RUNS FIRST)</Typography>
                                    <Typography variant="caption" color="text.secondary">Modify <code>payload</code> directly</Typography>
                                </Stack>
                                <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.paper' }}>
                                    <TextField
                                        multiline rows={6} fullWidth
                                        variant="standard"
                                        value={transformScript}
                                        onChange={e => setTransformScript(e.target.value)}
                                        placeholder="// e.g. payload.processedAt = new Date().toISOString();"
                                        InputProps={{
                                            disableUnderline: true,
                                            sx: { fontFamily: 'monospace', fontSize: 12 }
                                        }}
                                    />
                                </Paper>
                            </Box>
                        )}

                        {routingStrategy === 'conditional' ? (
                            <Box>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" fontWeight="bold">Rules Table</Typography>
                                    <Button size="small" startIcon={<Plus size={16} />} variant="outlined" onClick={addRule}>Add Rule</Button>
                                </Stack>

                                <Stack spacing={1}>
                                    {routingRules.length === 0 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ py: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                                            No rules defined. Add one to start routing based on transformed data.
                                        </Typography>
                                    )}
                                    {routingRules.map((rule) => (
                                        <Stack key={rule.id} spacing={1.5} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.default', position: 'relative' }}>
                                            {/* Header: Semantic Builder Top Row */}
                                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography variant="caption" fontWeight="900" color="primary.main" sx={{ mr: 1 }}>IF</Typography>

                                                    <Select
                                                        size="small" value={rule.sourceStreamId || 'any'}
                                                        onChange={e => updateRule(rule.id, { sourceStreamId: e.target.value === 'any' ? undefined : e.target.value })}
                                                        sx={{ height: 32, fontSize: 11, minWidth: 140, bgcolor: 'action.hover', borderRadius: 1.5 }}
                                                    >
                                                        <MenuItem value="any">Any Source</MenuItem>
                                                        {sources.map(s => (
                                                            <MenuItem key={s.streamId} value={s.streamId}>{streams.find(st => st.id === s.streamId)?.name}</MenuItem>
                                                        ))}
                                                    </Select>

                                                    <Select
                                                        size="small" value={rule.sourceEventId || 'any'}
                                                        onChange={e => updateRule(rule.id, { sourceEventId: e.target.value === 'any' ? undefined : e.target.value })}
                                                        sx={{ height: 32, fontSize: 11, minWidth: 140, bgcolor: 'action.hover', borderRadius: 1.5 }}
                                                    >
                                                        <MenuItem value="any">Any Event</MenuItem>
                                                        {events.filter(ev => {
                                                            const sourceIds = (sources.find(src => src.streamId === rule.sourceStreamId) || sources[0])?.eventIds || [];
                                                            return sourceIds.includes(ev.id);
                                                        }).map(ev => (
                                                            <MenuItem key={ev.id} value={ev.id}>{ev.name}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </Stack>
                                                <IconButton size="small" color="error" onClick={() => deleteRule(rule.id)} sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}><Trash2 size={16} /></IconButton>
                                            </Stack>

                                            {/* WHERE Row: Full Width Condition Textarea */}
                                            <Stack direction="row" spacing={2} sx={{ pl: 3, borderLeft: '2px solid', borderColor: 'divider' }}>
                                                <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ minWidth: 46, mt: 1 }}>WHERE</Typography>
                                                <Box sx={{ flex: 1 }}>
                                                    <TextField
                                                        size="small" fullWidth multiline rows={2}
                                                        placeholder="e.g. payload.price > 100 && payload.status === 'valid'"
                                                        value={rule.condition} onChange={e => updateRule(rule.id, { condition: e.target.value })}
                                                        sx={{ 
                                                            '& .MuiInputBase-root': { py: 0.8, bgcolor: 'background.paper' },
                                                            '& .MuiInputBase-input': { fontSize: 12, fontFamily: 'monospace' } 
                                                        }}
                                                        variant="outlined"
                                                    />
                                                    
                                                    {/* Schema Helper Chips */}
                                                    {(() => {
                                                        const ev = events.find(e => e.id === rule.sourceEventId);
                                                        if (!ev) {
                                                            return (
                                                                <Box sx={{ mt: 1, p: 0.8, borderRadius: 1.5, bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                                                                        💡 Select an <b>Event TYPE</b> above to see discoverable fields here.
                                                                    </Typography>
                                                                </Box>
                                                            );
                                                        }
                                                        let fields: string[] = [];
                                                        try { fields = Object.keys(JSON.parse(ev.schema)); } catch(e) {}
                                                        if (fields.length === 0) {
                                                            return (
                                                                <Box sx={{ mt: 1, p: 0.8, borderRadius: 1.5, bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                                                                        ℹ️ This event has no schema defined. You can still use <code>payload</code>.
                                                                    </Typography>
                                                                </Box>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <Box sx={{ mt: 1 }}>
                                                                <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                                                    QUICK FIELDS (Click to add):
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                                                                    {fields.map(f => (
                                                                        <Chip 
                                                                            key={f} 
                                                                            label={`payload.${f}`} 
                                                                            size="small" 
                                                                            onClick={() => {
                                                                                const newVal = rule.condition ? `${rule.condition} && payload.${f} === ""` : `payload.${f} === ""`;
                                                                                updateRule(rule.id, { condition: newVal });
                                                                            }}
                                                                            sx={{ 
                                                                                height: 18, 
                                                                                fontSize: 10, 
                                                                                fontFamily: 'monospace', 
                                                                                bgcolor: 'rgba(99, 102, 241, 0.08)',
                                                                                color: 'primary.main',
                                                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                                                cursor: 'pointer',
                                                                                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.15)' }
                                                                            }} 
                                                                        />
                                                                    ))}
                                                                </Box>
                                                            </Box>
                                                        );
                                                    })()}

                                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontSize: 10, lineHeight: 1.4, opacity: 0.8 }}>
                                                        The <b>payload</b> refers to the entire incoming event. We use <code>payload.field</code> to check specific values (e.g., <code>payload.amount &gt; 10</code>).
                                                    </Typography>
                                                </Box>



                                            </Stack>



                                            {/* Bottom Row: Then EMIT */}
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 3, py: 0.5, borderLeft: '2px solid', borderColor: 'primary.light' }}>
                                                <Typography variant="caption" fontWeight="900" color="secondary.main" sx={{ mr: 1 }}>THEN EMIT</Typography>

                                                <Select
                                                    size="small" value={rule.sinkStreamId}
                                                    onChange={e => updateRule(rule.id, { sinkStreamId: e.target.value })}
                                                    sx={{ height: 32, fontSize: 11, minWidth: 120, bgcolor: 'action.hover' }}
                                                >
                                                    {sinks.map(s => (
                                                        <MenuItem key={s.streamId} value={s.streamId}>{streams.find(st => st.id === s.streamId)?.name}</MenuItem>
                                                    ))}
                                                </Select>

                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">AS</Typography>

                                                <Select
                                                    size="small" value={rule.outputEventId || 'generic'}
                                                    onChange={e => {
                                                        const evId = e.target.value;
                                                        const nextRule: any = { outputEventId: evId === 'generic' ? undefined : evId };

                                                        // Auto-populate transform if event is selected
                                                        if (evId !== 'generic') {
                                                            const ev = events.find(event => event.id === evId);
                                                            if (ev && (!rule.transformScript || rule.transformScript.trim() === '')) {
                                                                try {
                                                                    const schema = JSON.parse(ev.schema);
                                                                    nextRule.transformScript = `// Construct ${ev.name}\nreturn ${JSON.stringify(schema, null, 2)};`;
                                                                } catch {
                                                                    nextRule.transformScript = `// Construct ${ev.name}\nreturn ${ev.schema};`;
                                                                }
                                                            }
                                                            nextRule._showScript = true; // Auto-open the editor
                                                        }
                                                        updateRule(rule.id, nextRule);
                                                        if (nextRule._showScript) setVisibleRuleScripts(prev => ({ ...prev, [rule.id]: true }));
                                                    }}
                                                    sx={{ height: 32, fontSize: 11, minWidth: 140, bgcolor: 'action.hover' }}
                                                >
                                                    <MenuItem value="generic">Generic Payload</MenuItem>
                                                    {(sinks.find(s => s.streamId === rule.sinkStreamId)?.eventIds || []).map(eid => (
                                                        <MenuItem key={eid} value={eid}>{events.find(ev => ev.id === eid)?.name}</MenuItem>
                                                    ))}
                                                </Select>

                                                <IconButton
                                                    size="small"
                                                    color={rule.transformScript ? 'primary' : 'default'}
                                                    onClick={() => setVisibleRuleScripts(prev => ({ ...prev, [rule.id]: !prev[rule.id] }))}
                                                    sx={{ ml: 'auto' }}
                                                >
                                                    <Code2 size={16} />
                                                </IconButton>
                                            </Stack>

                                            {/* Transform Block */}
                                            {visibleRuleScripts[rule.id] && (
                                                <Box sx={{ mt: 0.5, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                                                    <Typography variant="caption" fontWeight="bold" sx={{ mb: 1, display: 'block', color: 'primary.main', textTransform: 'uppercase' }}>
                                                        Data Construction Logic
                                                    </Typography>

                                                    {/* Mapping Helper */}
                                                    <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                                        <Stack spacing={1.5}>
                                                            {/* Input Reference */}
                                                            {(() => {
                                                                const inEv = events.find(e => e.id === rule.sourceEventId);
                                                                if (!inEv) return null;
                                                                let fields: string[] = [];
                                                                try { fields = Object.keys(JSON.parse(inEv.schema)); } catch(e) {}
                                                                if (fields.length === 0) return null;
                                                                return (
                                                                    <Box>
                                                                        <Typography variant="caption" sx={{ fontSize: 9, fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 0.5, letterSpacing: 0.5 }}>
                                                                            INPUT FIELDS (Source):
                                                                        </Typography>
                                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                            {fields.map(f => (
                                                                                <Chip 
                                                                                    key={f} label={f} size="small" 
                                                                                    onClick={() => {
                                                                                        const insert = `payload.${f}`;
                                                                                        const old = rule.transformScript || '';
                                                                                        updateRule(rule.id, { transformScript: old + insert });
                                                                                    }}
                                                                                    sx={{ height: 16, fontSize: 9, fontFamily: 'monospace', cursor: 'pointer' }} 
                                                                                />
                                                                            ))}
                                                                        </Box>
                                                                    </Box>
                                                                );
                                                            })()}

                                                            {/* Output Goal */}
                                                            {(() => {
                                                                const outEv = events.find(e => e.id === rule.outputEventId);
                                                                if (!outEv) return null;
                                                                let fields: string[] = [];
                                                                try { fields = Object.keys(JSON.parse(outEv.schema)); } catch(e) {}
                                                                if (fields.length === 0) return null;
                                                                return (
                                                                    <Box>
                                                                        <Typography variant="caption" sx={{ fontSize: 9, fontWeight: 'bold', color: 'secondary.main', display: 'block', mb: 0.5, letterSpacing: 0.5 }}>
                                                                            EXPECTED OUTPUT ({outEv.name}):
                                                                        </Typography>
                                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                            {fields.map(f => (
                                                                                <Chip 
                                                                                    key={f} label={f} size="small" variant="outlined" color="secondary"
                                                                                    onClick={() => {
                                                                                        const insert = `"${f}": ""`;
                                                                                        const old = rule.transformScript || '';
                                                                                        updateRule(rule.id, { transformScript: old + insert });
                                                                                    }}
                                                                                    sx={{ height: 16, fontSize: 9, fontFamily: 'monospace', cursor: 'pointer' }} 
                                                                                />
                                                                            ))}
                                                                        </Box>
                                                                    </Box>
                                                                );
                                                            })()}
                                                        </Stack>
                                                    </Box>

                                                    <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.paper' }}>
                                                        <TextField
                                                            multiline rows={8} fullWidth
                                                            variant="standard"
                                                            placeholder="// Example transformation:&#13;&#10;return {&#13;&#10;  id: payload.id,&#13;&#10;  status: 'PROCESSED'&#13;&#10;};"
                                                            value={rule.transformScript || ''}
                                                            onChange={e => updateRule(rule.id, { transformScript: e.target.value })}
                                                            InputProps={{
                                                                disableUnderline: true,
                                                                sx: { fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }
                                                            }}
                                                        />
                                                    </Paper>
                                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: 9, opacity: 0.8 }}>
                                                        💡 TIP: To modify the incoming data, use <code>return &#123; ...payload, newField: 'value' &#125;;</code>
                                                    </Typography>
                                                </Box>

                                            )}
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>
                        ) : (
                            <Box sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                                <Typography variant="body2">
                                    Rules table is only active for <b>Conditional</b> strategy.
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                )}
            </Box>

            <ModalFooter color={color} isEditing={!!editingItem} />
        </Box>
    );
};

export default ConsumerForm;
