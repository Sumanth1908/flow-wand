import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { motion } from 'framer-motion';
import useStore from '../../store/useStore';

type ConsumerNodeData = {
    label: string;
    description?: string;
    sourceCount?: number;
    sinkCount?: number;
    simulationState?: 'active' | 'visited' | null;
    activeFlowColor?: string;
    sourceEvents?: string[];
    sinkEvents?: string[];
};

const ConsumerNode = memo(({ data, selected }: NodeProps<Node<ConsumerNodeData>>) => {
    const layoutDirection = useStore(s => s.layoutDirection);
    const targetPos = layoutDirection === 'TB' ? Position.Top : Position.Left;
    const sourcePos = layoutDirection === 'TB' ? Position.Bottom : Position.Right;
    const isActive = data.simulationState === 'active';
    const isVisited = data.simulationState === 'visited';

    return (
        <motion.div
            className={`consumer-node ${selected ? 'selected' : ''} ${isActive ? 'active' : ''} ${isVisited ? 'visited' : ''}`}
            style={data.activeFlowColor ? {
                borderColor: data.activeFlowColor,
                boxShadow: selected ? `0 0 0 2px ${data.activeFlowColor}` : 'none'
            } as React.CSSProperties : {}}
            animate={
                isActive
                    ? {
                        boxShadow: [
                            '0 0 0px rgba(245, 158, 11, 0)',
                            `0 0 30px ${data.activeFlowColor || 'rgba(245, 158, 11, 0.8)'}`,
                            '0 0 0px rgba(245, 158, 11, 0)',
                        ],
                        scale: [1, 1.05, 1],
                    }
                    : {}
            }
            transition={isActive ? { duration: 1, repeat: Infinity } : {}}
        >
            <Handle type="target" position={targetPos} className="handle-target" />

            <div className="node-header consumer-header" style={data.activeFlowColor ? { borderBottomColor: data.activeFlowColor } as React.CSSProperties : {}}>
                <div className="node-icon consumer-icon" style={data.activeFlowColor ? { color: data.activeFlowColor, background: `color-mix(in srgb, ${data.activeFlowColor} 15%, transparent)` } as React.CSSProperties : {}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                </div>
                <span className="node-label">CONSUMER</span>
            </div>

            <div className="node-body">
                <div className="node-title">{data.label}</div>
            </div>

            {isActive && (
                <motion.div
                    className="processing-indicator"
                    initial={{ width: '0%' }}
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                />
            )}

            {isActive && (
                <motion.div
                    className="simulation-pulse consumer-pulse"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            )}

            <Handle type="source" position={sourcePos} className="handle-source" />
        </motion.div>
    );
});

ConsumerNode.displayName = 'ConsumerNode';
export default ConsumerNode;
