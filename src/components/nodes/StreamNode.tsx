import { memo } from 'react';
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
};

const StreamNode = memo(({ id, data, selected }: NodeProps<Node<StreamNodeData>>) => {
    const theme = useTheme();
    const layoutDirection = useStore(s => s.layoutDirection);
    const hoveredEdgeId = useStore(s => s.hoveredEdgeId);
    const targetPos = layoutDirection === 'TB' ? Position.Top : Position.Left;
    const sourcePos = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
    const isActive = data.simulationState === 'active';
    const isVisited = data.simulationState === 'visited';

    // Highlight if any hovered edge connects to this node
    const isEdgeHighlighted = !!hoveredEdgeId?.includes(id);
    // Derive which edge type is hovering to pick the glow color
    const highlightColor = hoveredEdgeId?.startsWith(id)
        ? '#f59e0b'  // sink edge leaving this stream back from consumer — amber
        : '#6366f1'; // source edge coming out — indigo

    const nodeColor = theme.palette.primary.main;

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
            {/* Amber: LEFT side — receives feedback (consumer → stream) */}
            <Handle id="snk-in" type="target" position={targetPos}
                style={{ width: 10, height: 10, background: '#f59e0b', border: `2px solid ${theme.palette.background.paper}`, zIndex: 10 }} />
            {/* Indigo: RIGHT side — sends data forward (stream → consumer) */}
            <Handle id="src-out" type="source" position={sourcePos}
                style={{ width: 10, height: 10, background: '#6366f1', border: `2px solid ${theme.palette.background.paper}`, zIndex: 10 }} />

            <Paper
                elevation={selected ? 8 : 2}
                sx={{
                    width: 280,
                    minHeight: 120, // Streams are usually slightly more compact than consumers
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'background.paper',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 3,
                    border: 1,
                    borderColor: selected
                        ? nodeColor
                        : isEdgeHighlighted
                            ? highlightColor
                            : (isVisited ? `color-mix(in srgb, ${nodeColor} 30%, ${theme.palette.divider})` : 'divider'),
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',

                    boxShadow: isEdgeHighlighted
                        ? `0 0 0 2px ${highlightColor}33, 0 8px 16px ${highlightColor}22`
                        : selected
                            ? `0 0 0 2px ${nodeColor}44, 0 12px 24px color-mix(in srgb, ${nodeColor} 15%, transparent)`
                            : '0 4px 12px rgba(0,0,0,0.1)',
                    '&:hover': {
                        borderColor: nodeColor,
                        transform: 'translateY(-2px)',
                        boxShadow: `0 12px 32px rgba(0,0,0,0.2)`
                    },
                    '&::before': { // Subtle glass glow
                        content: '""',
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 'inherit',
                        background: `linear-gradient(135deg, ${nodeColor}11 0%, transparent 40%)`,
                        pointerEvents: 'none'
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
                <Box sx={{ 
                    p: 2.5, 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1.2,
                    opacity: isVisited && !isActive && !selected ? 0.7 : 1, 
                }}>
                    <Typography 
                        variant="body1" 
                        fontWeight="900" 
                        sx={{ 
                            color: 'text.primary', 
                            fontSize: 16,
                            lineHeight: 1.2,
                            letterSpacing: -0.2
                        }}
                    >
                        {data.label}
                    </Typography>
                    {data.description && (
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                color: 'text.secondary', 
                                fontSize: 12,
                                lineHeight: 1.5,
                                fontWeight: 500
                            }}
                        >
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
