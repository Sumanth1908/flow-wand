import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Zap, Server, Database, Braces } from 'lucide-react';
import { Paper, Box, Stack, Typography, useTheme } from '@mui/material';
import useStore from '../../store/useStore';
import { ConsumerType } from '../../types';

type ConsumerNodeData = {
    label: string;
    description?: string;
    type?: ConsumerType;
    sourceCount?: number;
    sinkCount?: number;
    simulationState?: 'active' | 'visited' | null;
    sourceEvents?: string[];
    sinkEvents?: string[];
    dlqSinkStreamName?: string;
};

const ConsumerNode = memo(({ id, data, selected }: NodeProps<Node<ConsumerNodeData>>) => {
    const theme = useTheme();
    const layoutDirection = useStore(s => s.layoutDirection);
    const hoveredEdgeId = useStore(s => s.hoveredEdgeId);
    const targetPos = layoutDirection === 'TB' ? Position.Top : Position.Left;
    const sourcePos = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
    const isActive = data.simulationState === 'active';
    const isVisited = data.simulationState === 'visited';

    // Highlight if any hovered edge connects to this node
    const isEdgeHighlighted = !!hoveredEdgeId?.includes(id);
    // If the edge starts with this consumer's id, it's a sink (amber); otherwise source (indigo)
    const highlightColor = hoveredEdgeId?.startsWith(id) ? '#f59e0b' : '#6366f1';

    const nodeColor = theme.palette.secondary.main;
    const consumerType = data.type || 'default';

    // Different shapes based on type
    const getBorderRadius = () => {
        switch (consumerType) {
            case 'lambda': return 16;     // Pill shape
            case 'service': return 1;     // Sharp rectangle
            case 'database': return 4;    // Slightly rounded (will use custom top/bottom styling below to look cylindrical)
            case 'default':
            default: return 3;            // Standard rounded corner
        }
    };

    const getTypeIcon = () => {
        switch (consumerType) {
            case 'lambda': return <Braces size={14} />;
            case 'service': return <Server size={14} />;
            case 'database': return <Database size={14} />;
            case 'default':
            default: return <Zap size={14} />;
        }
    };

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
            {/* Indigo: LEFT side — receives data forward (stream → consumer) */}
            <Handle id="src-in" type="target" position={targetPos}
                style={{ width: 10, height: 10, background: '#6366f1', border: `2px solid ${theme.palette.background.paper}`, zIndex: 10 }} />
            {/* Amber: RIGHT side — sends feedback back (consumer → stream) */}
            <Handle id="snk-out" type="source" position={sourcePos}
                style={{ width: 10, height: 10, background: '#f59e0b', border: `2px solid ${theme.palette.background.paper}`, zIndex: 10 }} />

            <Paper
                elevation={selected ? 8 : 2}
                sx={{
                    minWidth: 240,
                    bgcolor: 'background.paper',
                    borderRadius: getBorderRadius(),
                    border: consumerType === 'database' ? 0 : 2,
                    borderBottomWidth: consumerType === 'database' ? 6 : 2,
                    borderTopWidth: consumerType === 'database' ? 6 : 2,
                    borderColor: selected
                        ? nodeColor
                        : isEdgeHighlighted
                            ? highlightColor
                            : (isVisited ? `color-mix(in srgb, ${nodeColor} 40%, ${theme.palette.divider})` : 'divider'),
                    borderStyle: 'solid',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    boxShadow: isEdgeHighlighted
                        ? `0 0 0 1px ${highlightColor}66, 0 0 8px ${highlightColor}55`
                        : selected
                            ? `0 0 20px color-mix(in srgb, ${nodeColor} 20%, transparent)`
                            : theme.shadows[2],
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
                        width: 24, height: 24, borderRadius: consumerType === 'lambda' ? '50%' : 1,
                        bgcolor: `color-mix(in srgb, ${nodeColor} 15%, transparent)`,
                        color: nodeColor,
                        mr: 1
                    }}>
                        {getTypeIcon()}
                    </Box>
                    <Typography variant="caption" fontWeight="900" sx={{ opacity: 0.7, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>
                        {consumerType === 'default' ? 'Consumer' : consumerType}
                    </Typography>
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
                    {/* DLQ Badge */}
                    {data.dlqSinkStreamName && (
                        <Box
                            sx={{
                                mt: 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 0.9,
                                py: 0.3,
                                borderRadius: 1.5,
                                bgcolor: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid',
                                borderColor: 'rgba(239, 68, 68, 0.35)',
                                maxWidth: '100%',
                                overflow: 'hidden',
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: 9,
                                    fontWeight: 900,
                                    color: '#ef4444',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.4,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                ☠ DLQ → {data.dlqSinkStreamName}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Progress Indicator (Simulation) */}
                {isActive && (
                    <Box sx={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                        bgcolor: nodeColor,
                        overflow: 'hidden'
                    }}>
                        <Box sx={{
                            height: '100%',
                            width: '30%',
                            bgcolor: 'white',
                            opacity: 0.5,
                            animation: 'move-loader 1s infinite ease-in-out',
                            '@keyframes move-loader': {
                                '0%': { transform: 'translateX(-100%)' },
                                '100%': { transform: 'translateX(400%)' }
                            }
                        }} />
                    </Box>
                )}
            </Paper>



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

ConsumerNode.displayName = 'ConsumerNode';
export default ConsumerNode;
