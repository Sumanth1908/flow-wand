import { Panel, Background, BackgroundVariant } from '@xyflow/react';
import { Square, Settings2, Send, Camera, ZoomIn, ZoomOut, Maximize, Lock, Unlock, RotateCcw, Search, X, Focus } from 'lucide-react';
import { Box, Paper, IconButton, Button, Typography, Tooltip, Divider, Badge, InputBase } from '@mui/material';
import type { useCanvasGraph } from './useCanvasGraph';

type Props = Pick<ReturnType<typeof useCanvasGraph>, 'theme' | 'fitView' | 'zoomIn' | 'zoomOut' | 'setFocusedConsumer' | 'isLocked' | 'setIsLocked' | 'activeFlow' | 'isFocusActive' | 'consumers' | 'focusedConsumerId' | 'searchOpen' | 'searchInputRef' | 'isSearchActive' | 'canvasSearchQuery' | 'setCanvasSearchQuery' | 'searchMatchCount' | 'setSearchOpen' | 'simulation' | 'stopSimulation' | 'clearSimulation' | 'openModal' | 'hasActiveSettings'>;
export default function CanvasControls({ theme, fitView, zoomIn, zoomOut, setFocusedConsumer, isLocked, setIsLocked, activeFlow, isFocusActive, consumers, focusedConsumerId, searchOpen, searchInputRef, isSearchActive, canvasSearchQuery, setCanvasSearchQuery, searchMatchCount, setSearchOpen, simulation, stopSimulation, clearSimulation, openModal, hasActiveSettings }: Props) {
    return <>
                {/* ── Zoom / Lock controls ─────────────────────── */}
                <Panel position="bottom-left" style={{ marginBottom: 16, marginLeft: 16 }}>
                    <Paper elevation={4} sx={{ display: 'flex', flexDirection: 'column', p: 0.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Tooltip title="Zoom In" placement="right">
                            <IconButton size="small" onClick={() => zoomIn()} sx={{ borderRadius: 1.5, mb: 0.5 }}><ZoomIn size={18} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Zoom Out" placement="right">
                            <IconButton size="small" onClick={() => zoomOut()} sx={{ borderRadius: 1.5, mb: 0.5 }}><ZoomOut size={18} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Fit View" placement="right">
                            <IconButton size="small" onClick={() => fitView({ padding: 0.3, duration: 800 })} sx={{ borderRadius: 1.5, mb: 0.5 }}><Maximize size={18} /></IconButton>
                        </Tooltip>
                        <Divider sx={{ my: 0.5 }} />
                        <Tooltip title={isLocked ? 'Unlock Canvas' : 'Lock Canvas'} placement="right">
                            <IconButton size="small" onClick={() => setIsLocked(!isLocked)} sx={{ borderRadius: 1.5, color: isLocked ? 'warning.main' : 'text.secondary' }}>
                                {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Panel>

                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />

                {/* ── Top-left: Flow / Focus badges ───────────── */}
                <Panel position="top-left">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {activeFlow && (
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 1.5,
                                px: 2, py: 1, borderRadius: 2, border: '1px solid',
                                borderColor: 'divider', bgcolor: 'background.paper',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.secondary', opacity: 0.5 }} />
                                <Typography variant="body2" fontWeight="bold">Viewing: {activeFlow.name}</Typography>
                            </Box>
                        )}

                        {isFocusActive && (
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 1.5,
                                px: 2, py: 1, borderRadius: 2, border: '1px solid',
                                borderColor: 'secondary.main', bgcolor: 'background.paper',
                                backdropFilter: 'blur(8px)',
                                boxShadow: `0 4px 16px ${theme.palette.secondary.main}33`,
                            }}>
                                <Focus size={14} color={theme.palette.secondary.main} />
                                <Typography variant="body2" fontWeight="bold" color="secondary.main">
                                    Focus: {consumers.find(c => c.id === focusedConsumerId)?.name}
                                </Typography>
                                <IconButton size="small" onClick={() => setFocusedConsumer(null)} sx={{ ml: 0.5, p: 0.3, color: 'text.secondary' }}>
                                    <X size={12} />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                </Panel>

                {/* ── Search Bar ───────────────────────────────── */}
                <Panel position="top-center" style={{ marginTop: 12, zIndex: 1000 }}>
                    {searchOpen ? (
                        <Paper
                            elevation={8}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1,
                                px: 2, py: 0.75, borderRadius: 3, minWidth: 340,
                                border: '1px solid',
                                borderColor: isSearchActive ? 'warning.main' : 'divider',
                                bgcolor: 'background.paper',
                                boxShadow: isSearchActive
                                    ? `0 0 0 2px ${theme.palette.warning.main}44, 0 8px 32px rgba(0,0,0,0.2)`
                                    : '0 8px 32px rgba(0,0,0,0.2)',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                            }}
                        >
                            <Search size={15} style={{ color: isSearchActive ? theme.palette.warning.main : theme.palette.text.secondary, flexShrink: 0 }} />
                            <InputBase
                                inputRef={searchInputRef}
                                placeholder="Search nodes… (Esc to close)"
                                inputProps={{ 'aria-label': 'Search canvas nodes' }}
                                value={canvasSearchQuery}
                                onChange={e => setCanvasSearchQuery(e.target.value)}
                                sx={{ flex: 1, fontSize: 13, fontWeight: 500 }}
                                autoFocus
                            />
                            {isSearchActive && (
                                <Typography variant="caption" color="warning.main" fontWeight="bold" sx={{ whiteSpace: 'nowrap', mr: 0.5 }}>
                                    {searchMatchCount} match{searchMatchCount !== 1 ? 'es' : ''}
                                </Typography>
                            )}
                            <IconButton size="small" onClick={() => { setSearchOpen(false); setCanvasSearchQuery(''); }} sx={{ p: 0.3 }}>
                                <X size={14} />
                            </IconButton>
                        </Paper>
                    ) : (
                        <Tooltip title="Search canvas (⌘F / Ctrl+F)">
                            <Paper
                                component="button"
                                aria-label="Search canvas"
                                elevation={2}
                                onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1,
                                    px: 1.5, py: 0.6, borderRadius: 2.5, cursor: 'pointer',
                                    border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                                    '&:hover': { borderColor: 'primary.main', boxShadow: `0 0 0 1px ${theme.palette.primary.main}44` },
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <Search size={14} style={{ color: theme.palette.text.secondary }} />
                                <Typography variant="caption" color="text.secondary" sx={{ userSelect: 'none' }}>Search</Typography>
                                <Box sx={{ px: 0.75, py: 0.2, borderRadius: 1, bgcolor: 'action.hover' }}>
                                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, fontFamily: 'monospace' }}>⌘F</Typography>
                                </Box>
                            </Paper>
                        </Tooltip>
                    )}
                </Panel>

                {/* ── Bottom centre toolbar ────────────────────── */}
                <Panel position="bottom-center" style={{ marginBottom: 16, zIndex: 1000 }}>
                    <Paper elevation={4} sx={{ display: 'flex', alignItems: 'center', p: 0.5, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Button
                            startIcon={<Send size={16} />}
                            onClick={() => openModal('fireEvent')}
                            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 'bold', px: 2, borderRadius: 2 }}
                        >
                            Fire Event
                        </Button>

                        {simulation.active && (
                            <Button
                                startIcon={<Square size={14} fill="currentColor" />}
                                onClick={stopSimulation}
                                sx={{ color: 'error.main', textTransform: 'none', fontWeight: 'bold', px: 2, borderRadius: 2 }}
                            >
                                Stop
                            </Button>
                        )}

                        {simulation.eventLog?.length > 0 && (
                            <Button
                                startIcon={<RotateCcw size={16} />}
                                onClick={clearSimulation}
                                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' }, textTransform: 'none', fontWeight: 'bold', px: 2, borderRadius: 2 }}
                            >
                                Reset
                            </Button>
                        )}

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />

                        <Tooltip title="Export canvas as PNG">
                            <IconButton onClick={() => openModal('snapshot')} sx={{ color: 'text.secondary', borderRadius: 2 }}>
                                <Camera size={18} />
                            </IconButton>
                        </Tooltip>

                        <Button
                            startIcon={
                                <Badge color="secondary" variant="dot" invisible={!hasActiveSettings}>
                                    <Settings2 size={16} />
                                </Badge>
                            }
                            onClick={() => openModal('settings')}
                            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 'bold', px: 2, borderRadius: 2 }}
                        >
                            Settings
                        </Button>
                    </Paper>
                </Panel>

    </>;
}
