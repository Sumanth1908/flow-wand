/**
 * components/modals/SettingsModal.tsx
 */
import React from 'react';
import { Stack, Box, Typography, Divider, Select, MenuItem, Button } from '@mui/material';
import { Footprints, RotateCcw } from 'lucide-react';
import useStore from '../../store/useStore';

const SettingsModal: React.FC = () => {
    const edgeStyle = useStore(s => s.edgeStyle);
    const setEdgeStyle = useStore(s => s.setEdgeStyle);
    const edgeShape = useStore(s => s.edgeShape);
    const setEdgeShape = useStore(s => s.setEdgeShape);
    const layoutDirection = useStore(s => s.layoutDirection);
    const setLayoutDirection = useStore(s => s.setLayoutDirection);
    const edgePathStyle = useStore(s => s.edgePathStyle);
    const setEdgePathStyle = useStore(s => s.setEdgePathStyle);
    const simulation = useStore(s => s.simulation);
    const setSimulationSpeed = useStore(s => s.setSimulationSpeed);
    const traceMode = useStore(s => s.traceMode);
    const setTraceMode = useStore(s => s.setTraceMode);
    const resetLayout = useStore(s => s.resetLayout);

    return (
        <Stack spacing={4} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={4}>
                {/* Appearance Settings */}
                <Stack spacing={2.5} sx={{ flex: 1 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight="900" sx={{ display: 'block', mb: 0.5, letterSpacing: 1.2 }}>Appearance</Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.primary" fontWeight="600">Node Layout</Typography>
                        <Select size="small" value={layoutDirection} onChange={e => setLayoutDirection(e.target.value as any)} sx={{ width: 140, height: 32, fontSize: '13px' }}>
                            <MenuItem value="LR">Left to Right</MenuItem>
                            <MenuItem value="TB">Top to Bottom</MenuItem>
                        </Select>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.primary" fontWeight="600">Path Style</Typography>
                        <Select size="small" value={edgePathStyle} onChange={e => setEdgePathStyle(e.target.value as any)} sx={{ width: 140, height: 32, fontSize: '13px' }}>
                            <MenuItem value="bezier">Smooth Curves</MenuItem>
                            <MenuItem value="step">Step (Orthogonal)</MenuItem>
                            <MenuItem value="straight">Straight Lines</MenuItem>
                        </Select>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.primary" fontWeight="600">Line Style</Typography>
                        <Select size="small" value={edgeStyle} onChange={e => setEdgeStyle(e.target.value as any)} sx={{ width: 140, height: 32, fontSize: '13px' }}>
                            <MenuItem value="solid">Solid</MenuItem>
                            <MenuItem value="dashed">Dashed</MenuItem>
                            <MenuItem value="dotted">Dotted</MenuItem>
                        </Select>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.primary" fontWeight="600">Animation</Typography>
                        <Select size="small" value={edgeShape} onChange={e => setEdgeShape(e.target.value as any)} sx={{ width: 140, height: 32, fontSize: '13px' }}>
                            <MenuItem value="circle">Circle</MenuItem>
                            <MenuItem value="square">Square</MenuItem>
                            <MenuItem value="diamond">Diamond</MenuItem>
                            <MenuItem value="star">Star</MenuItem>
                            <MenuItem value="pizza">🍕 Pizza</MenuItem>
                            <MenuItem value="ghost">👻 Ghost</MenuItem>
                            <MenuItem value="heart">❤️ Heart</MenuItem>
                            <MenuItem value="alien">👽 Alien</MenuItem>
                            <MenuItem value="rocket">🚀 Rocket</MenuItem>
                        </Select>
                    </Box>

                    <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={() => resetLayout()}
                        startIcon={<RotateCcw size={14} />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            mt: 1,
                            borderColor: 'divider',
                            bgcolor: 'action.hover',
                            '&:hover': { bgcolor: 'action.selected' }
                        }}
                    >
                        Reset Node Positions
                    </Button>
                </Stack>

                <Divider orientation="vertical" flexItem />

                {/* Simulation Settings */}
                <Stack spacing={2.5} sx={{ flex: 1 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight="900" sx={{ display: 'block', mb: 0.5, letterSpacing: 1.2 }}>Simulation</Typography>

                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.primary" fontWeight="600" sx={{ display: 'block', mb: 1.5 }}>Playback Speed</Typography>
                        <Stack direction="row" sx={{ bgcolor: 'background.default', borderRadius: 2, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                            {[
                                { label: '0.25×', value: 4000 },
                                { label: '0.5×', value: 2000 },
                                { label: '1×', value: 1000 },
                                { label: '2×', value: 500 },
                                { label: '4×', value: 250 }
                            ].map(spd => (
                                <Button
                                    key={spd.value}
                                    onClick={() => setSimulationSpeed(spd.value)}
                                    sx={{
                                        flex: 1, minWidth: 0, p: 0.75, borderRadius: 0, borderRight: spd.value !== 250 ? 1 : 0, borderColor: 'divider',
                                        bgcolor: simulation.speed === spd.value ? 'primary.main' : 'transparent',
                                        color: simulation.speed === spd.value ? '#fff' : 'text.secondary',
                                        '&:hover': { bgcolor: simulation.speed === spd.value ? 'primary.dark' : 'action.hover' },
                                        fontSize: '11px', fontWeight: 'bold'
                                    }}
                                >
                                    {spd.label}
                                </Button>
                            ))}
                        </Stack>
                    </Box>

                    <Box sx={{ mt: 'auto !important', pt: 2 }}>
                        <Button
                            fullWidth
                            variant={traceMode ? 'contained' : 'outlined'}
                            color={traceMode ? 'warning' : 'inherit'}
                            onClick={() => setTraceMode(!traceMode)}
                            startIcon={<Footprints size={14} />}
                            sx={{ textTransform: 'none', fontWeight: 'bold', fontSize: '13px', py: 1 }}
                        >
                            Trace Mode {traceMode ? 'ON' : 'OFF'}
                        </Button>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center', fontStyle: 'italic' }}>
                            Highlights active nodes and edges during simulation
                        </Typography>
                    </Box>
                </Stack>
            </Stack>
        </Stack>
    );
};

export default SettingsModal;
