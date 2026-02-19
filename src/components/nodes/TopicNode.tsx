import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { motion } from 'framer-motion';

type TopicNodeData = {
    label: string;
    partitions?: number;
    description?: string;
    eventNames?: string[];
    simulationState?: 'active' | 'visited' | null;
    activeFlowColor?: string;
};

const TopicNode = memo(({ data, selected }: NodeProps<Node<TopicNodeData>>) => {
    const isActive = data.simulationState === 'active';
    const isVisited = data.simulationState === 'visited';

    return (
        <motion.div
            className={`topic-node ${selected ? 'selected' : ''} ${isActive ? 'active' : ''} ${isVisited ? 'visited' : ''}`}
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

            <div className="node-header topic-header" style={data.activeFlowColor ? { borderBottomColor: data.activeFlowColor } as React.CSSProperties : {}}>
                <div className="node-icon topic-icon" style={data.activeFlowColor ? { color: data.activeFlowColor, background: `color-mix(in srgb, ${data.activeFlowColor} 15%, transparent)` } as React.CSSProperties : {}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                </div>
                <span className="node-label">KAFKA TOPIC</span>
            </div>

            <div className="node-body">
                <div className="node-title">{data.label}</div>
                {data.partitions && (
                    <div className="node-meta">
                        <span className="meta-badge">{data.partitions} partitions</span>
                    </div>
                )}
                {data.eventNames && data.eventNames.length > 0 && (
                    <div className="node-tags">
                        {data.eventNames.map(name => (
                            <span key={name} className="node-tag event-tag">{name}</span>
                        ))}
                    </div>
                )}
                {data.description && (
                    <div className="node-description">{data.description}</div>
                )}
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

TopicNode.displayName = 'TopicNode';
export default TopicNode;
