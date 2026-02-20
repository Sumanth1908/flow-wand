import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { motion } from 'framer-motion';

type StreamNodeData = {
    label: string;
    type: string;
    partitions?: number;
    description?: string;
    simulationState?: 'active' | 'visited' | null;
    activeFlowColor?: string;
};

const StreamNode = memo(({ data, selected }: NodeProps<Node<StreamNodeData>>) => {
    const isActive = data.simulationState === 'active';
    const isVisited = data.simulationState === 'visited';

    return (
        <motion.div
            className={`stream-node ${selected ? 'selected' : ''} ${isActive ? 'active' : ''} ${isVisited ? 'visited' : ''}`}
            style={data.activeFlowColor ? {
                borderColor: data.activeFlowColor,
                boxShadow: selected ? `0 0 0 2px ${data.activeFlowColor}` : 'none'
            } as React.CSSProperties : {}}
            animate={
                isActive
                    ? {
                        boxShadow: [
                            '0 0 0px rgba(99, 102, 241, 0)',
                            `0 0 30px ${data.activeFlowColor || 'rgba(99, 102, 241, 0.8)'}`,
                            '0 0 0px rgba(99, 102, 241, 0)',
                        ],
                        scale: [1, 1.05, 1],
                    }
                    : {}
            }
            transition={isActive ? { duration: 1, repeat: Infinity } : {}}
        >
            <Handle type="target" position={Position.Left} className="handle-target" />

            <div className="node-header stream-header" style={data.activeFlowColor ? { borderBottomColor: data.activeFlowColor } as React.CSSProperties : {}}>
                <div className="node-icon stream-icon" style={data.activeFlowColor ? { color: data.activeFlowColor, background: `color-mix(in srgb, ${data.activeFlowColor} 15%, transparent)` } as React.CSSProperties : {}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                </div>
                <span className="node-label">{(data.type || 'STREAM').toUpperCase()}</span>
            </div>

            <div className="node-body">
                <div className="node-title">{data.label}</div>
            </div>

            {isActive && (
                <motion.div
                    className="simulation-pulse"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            )}

            <Handle type="source" position={Position.Right} className="handle-source" />
        </motion.div>
    );
});

StreamNode.displayName = 'StreamNode';
export default StreamNode;
