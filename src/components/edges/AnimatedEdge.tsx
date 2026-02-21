import React, { useState } from 'react';
import { BaseEdge, getBezierPath, getStraightPath, getSmoothStepPath, EdgeLabelRenderer, EdgeProps } from '@xyflow/react';
import useStore from '../../store/useStore';

type AnimatedEdgeData = {
    simulationState?: 'active' | 'visited' | 'idle' | 'warning' | null;
    activeFlowColor?: string;
    speed?: number;
    label?: string;
    eventNames?: string[];
};

const MovingDots = React.memo(({ edgePath, flowColor, speed, shape }: { edgePath: string, flowColor: string, speed: number, shape: string }) => {
    let shapeElement;
    if (shape === 'square') {
        shapeElement = (
            <g>
                <rect x="-4.5" y="-4.5" width="9" height="9" fill={flowColor} filter={`drop-shadow(0 0 6px ${flowColor})`}>
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </rect>
            </g>
        );
    } else if (shape === 'diamond') {
        shapeElement = (
            <g>
                <polygon points="0,-6 6,0 0,6 -6,0" fill={flowColor} filter={`drop-shadow(0 0 6px ${flowColor})`}>
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </polygon>
            </g>
        );
    } else if (shape === 'star') {
        shapeElement = (
            <g>
                <polygon points="0,-6.5 2,-2 6.5,-2 3,1 4,6.5 0,3.5 -4,6.5 -3,1 -6.5,-2 -2,-2" fill={flowColor} filter={`drop-shadow(0 0 6px ${flowColor})`}>
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </polygon>
            </g>
        );
    } else if (shape === 'pizza') {
        shapeElement = (
            <g>
                <text x="-10" y="5" fontSize="14" filter={`drop-shadow(0 0 4px ${flowColor})`}>
                    🍕
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </text>
            </g>
        );
    } else if (shape === 'ghost') {
        shapeElement = (
            <g>
                <text x="-10" y="5" fontSize="14" filter={`drop-shadow(0 0 4px ${flowColor})`}>
                    👻
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </text>
            </g>
        );
    } else if (shape === 'heart') {
        shapeElement = (
            <g>
                <text x="-10" y="5" fontSize="14" filter={`drop-shadow(0 0 4px ${flowColor})`}>
                    ❤️
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </text>
            </g>
        );
    } else if (shape === 'alien') {
        shapeElement = (
            <g>
                <text x="-10" y="5" fontSize="14" filter={`drop-shadow(0 0 4px ${flowColor})`}>
                    👽
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </text>
            </g>
        );
    } else if (shape === 'rocket') {
        shapeElement = (
            <g>
                <text x="-10" y="5" fontSize="14" filter={`drop-shadow(0 0 4px ${flowColor})`}>
                    🚀
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </text>
            </g>
        );
    } else {
        // Default Circle
        shapeElement = (
            <g>
                <circle r="5" fill={flowColor} filter={`drop-shadow(0 0 6px ${flowColor})`}>
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </circle>
                <circle r="3" fill="#ffffff">
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} />
                </circle>
                <circle r="4" fill={flowColor} opacity="0.5">
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} begin="0.15s" />
                </circle>
                <circle r="2.5" fill={flowColor} opacity="0.3">
                    <animateMotion dur={`${speed}s`} repeatCount="indefinite" path={edgePath} begin="0.3s" />
                </circle>
            </g>
        );
    }

    return (
        <g pointerEvents="none" className="gpu-accelerate">
            {shapeElement}
        </g>
    );
});

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
    // Global style settings 
    const edgeStyleMode = useStore(s => s.edgeStyle);
    const edgeShape = useStore(s => s.edgeShape);
    const edgePathStyle = useStore(s => s.edgePathStyle);

    const pathParams = {
        sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition
    };

    let edgePath, labelX, labelY;
    if (edgePathStyle === 'straight') {
        [edgePath, labelX, labelY] = getStraightPath(pathParams);
    } else if (edgePathStyle === 'step') {
        [edgePath, labelX, labelY] = getSmoothStepPath({ ...pathParams, borderRadius: 0 });
    } else {
        [edgePath, labelX, labelY] = getBezierPath(pathParams);
    }

    const [isHovered, setIsHovered] = useState(false);
    const edgeData = data as AnimatedEdgeData | undefined;
    const isActive = edgeData?.simulationState === 'active';
    const isVisited = edgeData?.simulationState === 'visited';
    const isWarning = edgeData?.simulationState === 'warning';

    // Default flow color, overridden by warning cycle
    const flowColor = isWarning ? '#ef4444' : (edgeData?.activeFlowColor || '#6366f1');
    const hasEvents = edgeData?.eventNames && edgeData.eventNames.length > 0;

    const dashArray = edgeStyleMode === 'dashed' ? '8, 8' : edgeStyleMode === 'dotted' ? '3, 4' : 'none';

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: isActive || isVisited || isWarning ? flowColor : (isHovered ? '#e2e8f0' : (edgeData?.activeFlowColor || '#b4c4d4')),
                    strokeWidth: isActive || isVisited || isWarning ? 3 : (isHovered ? 3 : 2),
                    strokeDasharray: dashArray,
                    opacity: (isVisited || isWarning) && !isActive ? 0.6 : 1,
                    filter: isActive || isWarning ? `drop-shadow(0 0 6px ${flowColor})` : 'none',
                    transition: 'stroke 0.3s, stroke-width 0.3s, filter 0.3s, opacity 0.3s',
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

            {(isActive || isWarning) && (
                <MovingDots edgePath={edgePath} flowColor={flowColor} speed={edgeData?.speed || 1} shape={edgeShape} />
            )}

            {(isHovered) && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            fontSize: hasEvents ? 9 : 10,
                            fontWeight: 700,
                            color: '#ffffff',
                            background: isActive ? flowColor : 'rgba(15, 23, 42, 0.95)',
                            padding: hasEvents ? '4px 10px' : '3px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${isActive ? flowColor : 'rgba(148, 163, 184, 0.3)'}`,
                            pointerEvents: 'none',
                            fontFamily: "'Inter', sans-serif",
                            zIndex: 1000,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: '60px',
                            textAlign: 'center'
                        }}
                    >
                        {hasEvents ? (
                            <>
                                <div style={{ fontSize: '8px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {edgeData?.label === 'source' ? 'Consumed' : 'Produced'}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                                    {edgeData?.eventNames?.map(name => (
                                        <span key={name} style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '3px' }}>
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{edgeData?.label || 'Link'}</span>
                        )}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

export default AnimatedEdge;
