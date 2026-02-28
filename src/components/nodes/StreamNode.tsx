import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { Paper, Box, Stack, Typography, useTheme } from '@mui/material';
import useStore from '../../store/useStore';

type StreamNodeData = {
    label: string;
    type: string;
    partitions?: number;
    description?: string;
    simulationState?: 'active' | 'visited' | null;
    activeFlowColor?: string;
};

const StreamNode = memo(({ data, selected }: NodeProps<Node<StreamNodeData>>) => {
    const theme = useTheme();
    const layoutDirection = useStore(s => s.layoutDirection);
    const targetPos = layoutDirection === 'TB' ? Position.Top : Position.Left;
    const sourcePos = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
    const isActive = data.simulationState === 'active';
    const isVisited = data.simulationState === 'visited';

    const nodeColor = data.activeFlowColor || theme.palette.primary.main;

    return (
        <motion.div
            animate={
                isActive
                    ? {
                        scale: [1, 1.02, 1],
                    }
                    : {}
            }
            transition={isActive ? { duration: 1, repeat: Infinity } : {}}
            style={{ position: 'relative' }}
        >
            <Handle type="target" position={targetPos} style={{ width: 10, height: 10, background: theme.palette.text.secondary, border: `2px solid ${theme.palette.background.paper}`, zIndex: 10 }} />

            <Paper
                elevation={selected ? 8 : 2}
                sx={{
                    minWidth: 240,
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    border: 2,
                    borderColor: selected ? nodeColor : (isVisited ? `color-mix(in srgb, ${nodeColor} 40%, ${theme.palette.divider})` : 'divider'),
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    boxShadow: selected ? `0 0 20px color-mix(in srgb, ${nodeColor} 20%, transparent)` : theme.shadows[2],
                    '&:hover': {
                        borderColor: nodeColor,
                        boxShadow: `0 8px 24px rgba(0,0,0,0.3)`
                    }
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                        px: 2,
                        py: 1,
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: `color-mix(in srgb, ${nodeColor} 8%, ${theme.palette.background.default})`,
                        opacity: isVisited && !isActive && !selected ? 0.7 : 1
                    }}
                >
                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: 1,
                        bgcolor: `color-mix(in srgb, ${nodeColor} 15%, transparent)`,
                        color: nodeColor,
                        mr: 1
                    }}>
                        <BookOpen size={14} />
                    </Box>
                </Stack>

                {/* Node Body */}
                <Box sx={{ p: 2, opacity: isVisited && !isActive && !selected ? 0.7 : 1 }}>
                    <Typography variant="body1" fontWeight="bold" noWrap sx={{ color: 'text.primary', fontSize: 15 }}>
                        {data.label}
                    </Typography>
                    {data.description && (
                        <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary', mt: 0.5, fontSize: 11 }}>
                            {data.description}
                        </Typography>
                    )}
                </Box>

                {/* Simulation Indicator */}
                {isActive && (
                    <Box sx={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                        bgcolor: nodeColor,
                        boxShadow: `0 0 10px ${nodeColor}`,
                        animation: 'pulse-height 1.5s infinite',
                        '@keyframes pulse-height': {
                            '0%': { opacity: 0.5 },
                            '50%': { opacity: 1 },
                            '100%': { opacity: 0.5 }
                        }
                    }} />
                )}
            </Paper>

            <Handle type="source" position={sourcePos} style={{ width: 10, height: 10, background: theme.palette.text.secondary, border: `2px solid ${theme.palette.background.paper}`, zIndex: 10 }} />

            {/* Simulation Pulse Effect */}
            {isActive && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.2, 1.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        border: `4px solid ${nodeColor}`, borderRadius: 12,
                        pointerEvents: 'none', zIndex: -1
                    }}
                />
            )}
        </motion.div>
    );
});

StreamNode.displayName = 'StreamNode';
export default StreamNode;
