import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';

const FlinkJobNode = memo(({ data, selected }) => {
    const isActive = data.simulationState === 'active';
    const isVisited = data.simulationState === 'visited';
    const isSimulating = isActive || isVisited;

    return (
        <motion.div
            className={`flink-node ${selected ? 'selected' : ''} ${isActive ? 'active' : ''} ${isVisited ? 'visited' : ''}`}
            style={data.activeFlowColor ? {
                borderColor: data.activeFlowColor,
                boxShadow: selected ? `0 0 0 2px ${data.activeFlowColor}` : 'none'
            } : {}}
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
            <Handle type="target" position={Position.Left} className="handle-target" />

            <div className="node-header flink-header" style={data.activeFlowColor ? { borderBottomColor: data.activeFlowColor } : {}}>
                <div className="node-icon flink-icon" style={data.activeFlowColor ? { color: data.activeFlowColor, background: `color-mix(in srgb, ${data.activeFlowColor} 15%, transparent)` } : {}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                </div>
                <span className="node-label">FLINK JOB</span>
            </div>

            <div className="node-body">
                <div className="node-title">{data.label}</div>
                <div className="node-meta">
                    <span className="meta-badge source-badge">{data.sourceCount || 0} sources</span>
                    <span className="meta-badge sink-badge">{data.sinkCount || 0} sinks</span>
                </div>
                {data.description && (
                    <div className="node-description">{data.description}</div>
                )}
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
                    className="simulation-pulse flink-pulse"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            )}

            <Handle type="source" position={Position.Right} className="handle-source" />
        </motion.div>
    );
});

FlinkJobNode.displayName = 'FlinkJobNode';
export default FlinkJobNode;
