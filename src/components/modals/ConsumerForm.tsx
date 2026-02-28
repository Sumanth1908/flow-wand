/**
 * components/modals/ConsumerForm.tsx
 */
import React, { useState } from 'react';
import { Check, Plus, Trash2, Code2, GitBranch, Settings2, Info } from 'lucide-react';
import useStore from '../../store/useStore';
import ModalFooter from './ModalFooter';
import { Consumer, StreamConnection, RoutingStrategy, RoutingRule } from '../../types';
import {
    Stack, TextField, Typography, Box, Chip, Select, MenuItem,
    Slider, Divider, Tabs, Tab, Button, IconButton, Paper, Tooltip
} from '@mui/material';
import { v4 as uuid } from 'uuid';

interface ConsumerFormProps {
    color: string;
}

const ConsumerForm: React.FC<ConsumerFormProps> = ({ color }) => {
    const editingItem = useStore(s => s.editingItem) as Consumer | null;
    const closeModal = useStore(s => s.closeModal);
    const streams = useStore(s => s.streams);
    const events = useStore(s => s.events);
    const addConsumer = useStore(s => s.addConsumer);
    const updateConsumer = useStore(s => s.updateConsumer);

    const [tab, setTab] = useState(0);

    // General State
    const [name, setName] = useState(editingItem?.name || '');
    const [desc, setDesc] = useState(editingItem?.description || '');

    // Connection State
    const [sources, setSources] = useState<StreamConnection[]>(editingItem?.sources || []);
    const [sinks, setSinks] = useState<StreamConnection[]>(editingItem?.sinks || []);

    // Logic State
    const [routingStrategy, setRoutingStrategy] = useState<RoutingStrategy>(editingItem?.routingStrategy || 'broadcast');
    const [failureRate, setFailureRate] = useState(editingItem?.failureRate !== undefined ? editingItem.failureRate : 0.05);
    const [transformScript, setTransformScript] = useState(editingItem?.transformScript || '// Modify payload here\n// payload.status = "processed";\n// return payload;');
    const [routingRules, setRoutingRules] = useState<RoutingRule[]>(editingItem?.routingRules || []);
    const [visibleRuleScripts, setVisibleRuleScripts] = useState<Record<string, boolean>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const payload = {
            name: name.trim(),
            description: desc.trim(),
            sources,
            sinks,
            routingStrategy,
            failureRate,
            transformScript,
            routingRules
        };

        if (editingItem) {
            updateConsumer(editingItem.id, payload);
        } else {
            addConsumer(
                payload.name,
                payload.description,
                payload.sources,
                payload.sinks,
                payload.routingStrategy,
                payload.failureRate,
                payload.transformScript,
                payload.routingRules
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
                            />
                            <TextField
                                label="Short Description" fullWidth size="small"
                                value={desc} onChange={e => setDesc(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>

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
                                    {sinks.map(conn => (
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
                                    {routingRules.map((rule, idx) => (
                                        <Stack key={rule.id} spacing={1.5} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.default', position: 'relative' }}>
                                            {/* Header: Semantic Builder Top Row */}
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="caption" fontWeight="900" color="primary.main" sx={{ mr: 1 }}>IF</Typography>

                                                <Select
                                                    size="small" value={rule.sourceStreamId || 'any'}
                                                    onChange={e => updateRule(rule.id, { sourceStreamId: e.target.value === 'any' ? undefined : e.target.value })}
                                                    sx={{ height: 32, fontSize: 11, minWidth: 100, bgcolor: 'action.hover' }}
                                                >
                                                    <MenuItem value="any">Any Source</MenuItem>
                                                    {sources.map(s => (
                                                        <MenuItem key={s.streamId} value={s.streamId}>{streams.find(st => st.id === s.streamId)?.name}</MenuItem>
                                                    ))}
                                                </Select>

                                                <Select
                                                    size="small" value={rule.sourceEventId || 'any'}
                                                    onChange={e => updateRule(rule.id, { sourceEventId: e.target.value === 'any' ? undefined : e.target.value })}
                                                    sx={{ height: 32, fontSize: 11, minWidth: 100, bgcolor: 'action.hover' }}
                                                >
                                                    <MenuItem value="any">Any Event</MenuItem>
                                                    {events.filter(ev => {
                                                        const sourceIds = (sources.find(src => src.streamId === rule.sourceStreamId) || sources[0])?.eventIds || [];
                                                        return sourceIds.includes(ev.id);
                                                    }).map(ev => (
                                                        <MenuItem key={ev.id} value={ev.id}>{ev.name}</MenuItem>
                                                    ))}
                                                </Select>

                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">WHERE</Typography>

                                                <TextField
                                                    size="small" placeholder="payload.total > 100"
                                                    value={rule.condition} onChange={e => updateRule(rule.id, { condition: e.target.value })}
                                                    sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 11, fontFamily: 'monospace' } }}
                                                />

                                                <IconButton size="small" color="error" onClick={() => deleteRule(rule.id)} sx={{ ml: 1 }}><Trash2 size={16} /></IconButton>
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
                                                    <TextField
                                                        multiline rows={5} fullWidth
                                                        variant="standard"
                                                        placeholder="// Construct your output here..."
                                                        value={rule.transformScript || ''}
                                                        onChange={e => updateRule(rule.id, { transformScript: e.target.value })}
                                                        InputProps={{
                                                            disableUnderline: true,
                                                            sx: { fontFamily: 'monospace', fontSize: 11 }
                                                        }}
                                                    />
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
