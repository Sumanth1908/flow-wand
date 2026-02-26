import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ListTree,
    BookOpen,
    Zap,
    X,
    ChevronDown,
    ChevronUp,
    RotateCcw
} from 'lucide-react';
import { Drawer, Box, Stack, Typography, IconButton, Divider, Tooltip, Badge, Button } from '@mui/material';
import useStore from '../../store/useStore';
import SimulationLog from './SimulationLog';
import { APP_CONFIG } from '../../lib/config';

const MotionBox = motion(Box);

const SimulationDrawer: React.FC = () => {
    const simulation = useStore(s => s.simulation);
    const advanceSimulation = useStore(s => s.advanceSimulation);
    const clearSimulation = useStore(s => s.clearSimulation);
    const stopSimulation = useStore(s => s.stopSimulation);
    const rightSidebarOpen = useStore(s => s.rightSidebarOpen);
    const setRightSidebar = useStore(s => s.setRightSidebar);
    const prevActiveRef = useRef(simulation.active);

    // Automatically open right sidebar ONLY when simulation starts
    useEffect(() => {
        if (simulation.active && !prevActiveRef.current) {
            setRightSidebar(true);
        }
        prevActiveRef.current = simulation.active;
    }, [simulation.active, setRightSidebar]);


    // Interval logic
    const advanceRef = useRef(advanceSimulation);
    useEffect(() => { advanceRef.current = advanceSimulation; }, [advanceSimulation]);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (simulation.active) {
            intervalRef.current = setInterval(() => {
                const hasMore = advanceRef.current();
                if (!hasMore && intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }, simulation.speed);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [simulation.active, simulation.speed]);

    const hasLog = simulation.eventLog?.length > 0;

    return (
        <>
            {!rightSidebarOpen && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 24,
                        right: 24,
                        zIndex: 1100,
                    }}
                >
                    <Badge
                        badgeContent={simulation.eventLog?.length || 0}
                        color="primary"
                        max={999}
                        sx={{
                            '& .MuiBadge-badge': {
                                right: 4,
                                top: 4,
                                border: '2px solid',
                                borderColor: 'background.paper',
                            }
                        }}
                    >
                        <Tooltip title="View Execution Trace" placement="left">
                            <IconButton
                                onClick={() => setRightSidebar(true)}
                                sx={{
                                    width: 52,
                                    height: 52,
                                    bgcolor: simulation.active ? 'success.main' : 'primary.main',
                                    color: 'white',
                                    boxShadow: 4,
                                    ...(simulation.active && {
                                        animation: 'pulse-float 2s infinite ease-in-out',
                                        '@keyframes pulse-float': {
                                            '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0px rgba(16, 185, 129, 0.4)' },
                                            '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 12px rgba(16, 185, 129, 0)' },
                                            '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0px rgba(16, 185, 129, 0)' }
                                        }
                                    }),
                                    '&:hover': {
                                        bgcolor: simulation.active ? 'success.dark' : 'primary.dark',
                                        transform: 'scale(1.1)',
                                    }
                                }}
                            >
                                <ListTree size={24} />
                            </IconButton>
                        </Tooltip>
                    </Badge>
                </Box>
            )}

            <Drawer
                anchor="right"
                open={rightSidebarOpen}
                onClose={() => setRightSidebar(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 420 },
                        bgcolor: 'background.paper',
                        backgroundImage: 'none',
                        borderLeft: 1,
                        borderColor: 'divider',
                    }
                }}
            >
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Header */}
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.default' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                p: 1, borderRadius: 2,
                                bgcolor: simulation.active ? 'success.light' : 'primary.light',
                                color: 'white',
                                ...(simulation.active && {
                                    animation: 'pulse 2s infinite ease-in-out',
                                    '@keyframes pulse': {
                                        '0%': { transform: 'scale(0.95)', opacity: 0.8 },
                                        '50%': { transform: 'scale(1.05)', opacity: 1 },
                                        '100%': { transform: 'scale(0.95)', opacity: 0.8 }
                                    }
                                })
                            }}>
                                <ListTree size={20} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                                    Execution Trace
                                </Typography>
                                {simulation.active && (
                                    <Typography variant="caption" color="success.main" fontWeight="800" sx={{ letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />
                                        LIVE
                                    </Typography>
                                )}
                            </Box>

                            <Tooltip title="Support this project">
                                <IconButton
                                    href={APP_CONFIG.author.buyMeACoffee}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="small"
                                    sx={{
                                        bgcolor: '#FFDD00',
                                        color: '#000',
                                        '&:hover': { bgcolor: '#FFCC00' },
                                        width: 28, height: 28,
                                        ml: 1
                                    }}
                                >
                                    <span style={{ fontSize: 14 }}>☕️</span>
                                </IconButton>
                            </Tooltip>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton onClick={() => setRightSidebar(false)} size="small" sx={{ color: 'text.secondary' }}>
                                <X size={20} />
                            </IconButton>
                        </Stack>
                    </Box>

                    {/* Summary Row - Now at Top */}
                    {hasLog && (
                        <Box sx={{ px: 2, py: 1.2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                            <Stack direction="row" spacing={2} justifyContent="space-around" divider={<Divider orientation="vertical" flexItem />}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <BookOpen size={14} color="#6366f1" />
                                    <Typography variant="caption" fontWeight="900" color="text.secondary">
                                        {simulation.visitedStreamIds?.length || 0} STREAMS
                                    </Typography>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Zap size={14} color="#f59e0b" />
                                    <Typography variant="caption" fontWeight="900" color="text.secondary">
                                        {simulation.visitedConsumerIds?.length || 0} CONSUMERS
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    )}

                    {/* Body - Logs Area */}
                    <Box sx={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                        {hasLog ? (
                            <SimulationLog log={simulation.eventLog || []} />
                        ) : (
                            <Box sx={{ p: 6, textAlign: 'center', mt: 4 }}>
                                <ListTree size={48} strokeWidth={1} style={{ opacity: 0.1, marginBottom: 16 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Log is empty. Use the <b>Event Dispatcher</b> from the bottom bar to inject data.
                                </Typography>
                            </Box>
                        )}
                    </Box>

                </Box>
            </Drawer>
        </>
    );
};

export default SimulationDrawer;
