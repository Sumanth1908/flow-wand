import React, { useState } from 'react';
import { BaseEdge, getBezierPath, getStraightPath, getSmoothStepPath, EdgeLabelRenderer, EdgeProps, useReactFlow } from '@xyflow/react';
import useStore from '../../store/useStore';

type AnimatedEdgeData = {
    simulationState?: 'active' | 'visited' | 'idle' | 'warning' | null;
    activeFlowColor?: string;
    edgeTypeColor?: string;
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
    source,
    target,
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
    const edgeStyleMode = useStore(s => s.edgeStyle);
    const edgeShape = useStore(s => s.edgeShape);
    const edgePathStyle = useStore(s => s.edgePathStyle);
    const themeColorMode = useStore(s => s.theme);
    const updateEdgeRouting = useStore(s => s.updateEdgeRouting);
    const hoveredEdgeId = useStore(s => s.hoveredEdgeId);
    const setHoveredEdge = useStore(s => s.setHoveredEdge);
    const { screenToFlowPosition } = useReactFlow();

    const [isDragging, setIsDragging] = useState(false);

    // Hovered if: globally flagged OR mid-drag (mouse may have left the hit area)
    const isHovered = hoveredEdgeId === id || isDragging;

    const pathParams = {
        sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition
    };

    let edgePath, labelX, labelY;
    const anyEdgeData = data as any;
    // We override routing through Zustand directly in the component so it stays completely real-time without re-firing buildGraph
    const globalRoutings = useStore(s => s.edgeRoutings);
    const routingPoint = globalRoutings[id] || (anyEdgeData?.routing as { cx: number, cy: number } | undefined);

    if (routingPoint) {
        edgePath = `M ${sourceX} ${sourceY} Q ${routingPoint.cx} ${routingPoint.cy} ${targetX} ${targetY}`;
        labelX = 0.25 * sourceX + 0.5 * routingPoint.cx + 0.25 * targetX;
        labelY = 0.25 * sourceY + 0.5 * routingPoint.cy + 0.25 * targetY;
    } else if (edgePathStyle === 'straight') {
        [edgePath, labelX, labelY] = getStraightPath(pathParams);
    } else if (edgePathStyle === 'step') {
        [edgePath, labelX, labelY] = getSmoothStepPath({ ...pathParams, borderRadius: 16 });
    } else {
        [edgePath, labelX, labelY] = getBezierPath({ ...pathParams, curvature: 0.25 });
    }

    const edgeData = data as AnimatedEdgeData | undefined;
    const isActive = edgeData?.simulationState === 'active';
    const isVisited = edgeData?.simulationState === 'visited';
    const isWarning = edgeData?.simulationState === 'warning';

    // Default flow color, overridden by warning cycle
    const flowColor = isWarning ? '#ef4444' : (edgeData?.activeFlowColor || edgeData?.edgeTypeColor || '#6366f1');
    const baseColor = edgeData?.edgeTypeColor
        ? `color-mix(in srgb, ${edgeData.edgeTypeColor} 55%, ${themeColorMode === 'dark' ? '#475569' : '#94a3b8'})`
        : (themeColorMode === 'dark' ? '#94a3b8' : '#64748b');
    const hasEvents = edgeData?.eventNames && edgeData.eventNames.length > 0;

    const dashArray = edgeStyleMode === 'dashed' ? '8, 8' : edgeStyleMode === 'dotted' ? '3, 4' : 'none';
    const isEdgeHovered = isHovered;

    // Hover stroke: bright type color + glow; active: flow color + glow; idle: muted type color
    const hoverStrokeColor = edgeData?.edgeTypeColor || '#6366f1';
    const strokeColor = isWarning
        ? '#ef4444'
        : isActive || isVisited
            ? flowColor
            : isEdgeHovered
                ? hoverStrokeColor
                : (edgeData?.activeFlowColor || baseColor);
    const strokeWidth = isEdgeHovered ? 4 : 2.5;
    // Subtle single glow on hover; stronger during simulation
    const edgeFilter = isActive || isWarning
        ? `drop-shadow(0 0 4px ${flowColor})`
        : isEdgeHovered
            ? `drop-shadow(0 0 6px ${hoverStrokeColor}88)`
            : 'none';

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: strokeColor,
                    strokeWidth,
                    strokeDasharray: dashArray,
                    opacity: (isVisited || isWarning) && !isActive ? 0.6 : 1,
                    filter: edgeFilter,
                    transition: 'stroke 0.2s, stroke-width 0.2s, filter 0.2s, opacity 0.3s',
                }}
            />

            {/* Hit area + drag handle — all in one <g> so hover persists over the circle */}
            <g
                onMouseEnter={() => setHoveredEdge(id)}
                onMouseLeave={() => { if (!isDragging) setHoveredEdge(null); }}
            >
                {/* Invisible wider stroke for easy hover targeting */}
                <path
                    d={edgePath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={24}
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                />

                {/* Drag handle — inside the <g> so mouseLeave doesn't fire when you hover it */}
                {isHovered && (
                    <circle
                        cx={routingPoint ? routingPoint.cx : labelX}
                        cy={routingPoint ? routingPoint.cy : labelY}
                        r={9}
                        fill={hoverStrokeColor}
                        stroke="#ffffff"
                        strokeWidth={3}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'all' }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIsDragging(true);
                            document.body.style.cursor = 'grabbing';

                            const handlePointerMove = (evt: PointerEvent) => {
                                const fp = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
                                updateEdgeRouting(id, { cx: fp.x, cy: fp.y });
                            };
                            const handlePointerUp = () => {
                                window.removeEventListener('pointermove', handlePointerMove);
                                window.removeEventListener('pointerup', handlePointerUp);
                                setIsDragging(false);
                                document.body.style.cursor = '';
                            };
                            window.addEventListener('pointermove', handlePointerMove);
                            window.addEventListener('pointerup', handlePointerUp);
                        }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            updateEdgeRouting(id, null);
                        }}
                    />
                )}
            </g>

            {(isActive || isWarning) && (
                <MovingDots edgePath={edgePath} flowColor={flowColor} speed={edgeData?.speed || 1} shape={edgeShape} />
            )}

            {isHovered && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            fontSize: hasEvents ? 9 : 10,
                            fontWeight: 700,
                            color: '#ffffff',
                            background: isActive ? flowColor : `color-mix(in srgb, ${hoverStrokeColor} 20%, rgba(15,23,42,0.97))`,
                            padding: hasEvents ? '5px 10px' : '4px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${hoverStrokeColor}`,
                            pointerEvents: 'none',
                            fontFamily: "'Inter', sans-serif",
                            zIndex: 1000,
                            boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 8px ${hoverStrokeColor}44`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: '60px',
                            textAlign: 'center',
                            // Push tooltip above the drag handle
                            marginTop: '-36px',
                        }}
                    >
                        {hasEvents ? (
                            <>
                                <div style={{ fontSize: '8px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {edgeData?.label === 'source' ? '▶ Consumed' : '◀ Produced'}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                                    {edgeData?.eventNames?.map(name => (
                                        <span key={name} style={{ background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: '3px' }}>
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
