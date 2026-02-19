import React, { useState } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer, EdgeProps } from '@xyflow/react';

type AnimatedEdgeData = {
    simulationState?: 'active' | null;
    activeFlowColor?: string;
    speed?: number;
    label?: string;
};

const AnimatedEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    style,
}) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const [isHovered, setIsHovered] = useState(false);
    const edgeData = data as AnimatedEdgeData | undefined;
    const isActive = edgeData?.simulationState === 'active';
    const flowColor = edgeData?.activeFlowColor || '#6366f1';

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: isActive ? flowColor : (isHovered ? 'rgba(148, 163, 184, 0.8)' : (edgeData?.activeFlowColor || 'rgba(148, 163, 184, 0.4)')),
                    strokeWidth: isActive ? 3 : (isHovered ? 2.5 : 1.5),
                    filter: isActive ? `drop-shadow(0 0 6px ${flowColor})` : 'none',
                    transition: 'stroke 0.3s, stroke-width 0.3s, filter 0.3s',
                }}
            />

            {/* Invisible wider edge for easier hovering */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ cursor: 'pointer' }}
            />

            {isActive && (
                <g pointerEvents="none">
                    <circle r="5" fill={flowColor} filter={`drop-shadow(0 0 6px ${flowColor})`}>
                        <animateMotion
                            dur={`${edgeData?.speed || 1}s`}
                            repeatCount="indefinite"
                            path={edgePath}
                        />
                    </circle>
                    <circle r="3" fill="#ffffff">
                        <animateMotion
                            dur={`${edgeData?.speed || 1}s`}
                            repeatCount="indefinite"
                            path={edgePath}
                        />
                    </circle>
                    {/* Trail particles */}
                    <circle r="4" fill={flowColor} opacity="0.5">
                        <animateMotion
                            dur={`${edgeData?.speed || 1}s`}
                            repeatCount="indefinite"
                            path={edgePath}
                            begin="0.15s"
                        />
                    </circle>
                    <circle r="2.5" fill={flowColor} opacity="0.3">
                        <animateMotion
                            dur={`${edgeData?.speed || 1}s`}
                            repeatCount="indefinite"
                            path={edgePath}
                            begin="0.3s"
                        />
                    </circle>
                </g>
            )}

            {(edgeData?.label && isHovered) && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#ffffff',
                            background: isActive ? flowColor : 'rgba(15, 23, 42, 0.95)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: `1px solid ${isActive ? flowColor : 'rgba(148, 163, 184, 0.3)'}`,
                            pointerEvents: 'none',
                            fontFamily: "'JetBrains Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            zIndex: 1000,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        }}
                    >
                        {edgeData.label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

export default AnimatedEdge;
