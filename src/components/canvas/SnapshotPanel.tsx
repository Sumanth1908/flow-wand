/**
 * components/canvas/SnapshotPanel.tsx
 * ─────────────────────────────────────────────────────────────
 * Popup panel for exporting the canvas as a high-resolution PNG.
 * Uses React Flow's viewport API to render nodes at native size.
 */
import React, { useState } from 'react';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { Camera, X, Download, Monitor, Layers, Image as ImageIcon, FileCode } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';

interface SnapshotPanelProps {
    onClose: () => void;
}

const RESOLUTIONS = [
    { label: '1×', value: 1, desc: 'Standard' },
    { label: '2×', value: 2, desc: 'Retina' },
    { label: '3×', value: 3, desc: 'High-Res' },
    { label: '4×', value: 4, desc: 'Ultra' },
];

const SCOPES = [
    { id: 'viewport', label: 'Current View', icon: Monitor, desc: 'Export what you see' },
    { id: 'all', label: 'All Nodes', icon: Layers, desc: 'Fit all nodes in export' },
] as const;

type Scope = typeof SCOPES[number]['id'];

const SnapshotPanel: React.FC<SnapshotPanelProps> = ({ onClose }) => {
    const [scope, setScope] = useState<Scope>('all');
    const [format, setFormat] = useState<'png' | 'svg'>('svg');
    const [pixelRatio, setPixelRatio] = useState(3);
    const [isExporting, setIsExporting] = useState(false);
    const { getNodes } = useReactFlow();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement;
            if (!viewportEl) return;

            const bgColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--bg-primary').trim() || '#0a0e1a';

            if (scope === 'all') {
                // Get bounds of all nodes and render at native scale
                const allNodes = getNodes();
                if (allNodes.length === 0) return;

                const nodesBounds = getNodesBounds(allNodes);
                const padding = 60;
                const imageWidth = nodesBounds.width + padding * 2;
                const imageHeight = nodesBounds.height + padding * 2;

                const viewport = getViewportForBounds(
                    nodesBounds,
                    imageWidth,
                    imageHeight,
                    0.5,  // minZoom
                    2,    // maxZoom
                    padding,
                );

                const filterNodes = (node: HTMLElement) => {
                    const cls = node?.classList;
                    if (!cls) return true;
                    // Exclude HUD, minimap, controls, and canvas backgrounds
                    if (cls.contains('react-flow__controls')) return false;
                    if (cls.contains('react-flow__minimap')) return false;
                    if (cls.contains('react-flow__panel')) return false;
                    if (cls.contains('react-flow__background')) return false;
                    return true;
                };

                const exportOptions = {
                    backgroundColor: bgColor,
                    width: imageWidth,
                    height: imageHeight,
                    pixelRatio: format === 'png' ? pixelRatio : 1,
                    filter: filterNodes,
                    style: {
                        width: `${imageWidth}px`,
                        height: `${imageHeight}px`,
                        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                    },
                };

                const dataUrl = format === 'png'
                    ? await toPng(viewportEl, exportOptions)
                    : await toSvg(viewportEl, exportOptions);

                downloadImage(dataUrl, format);
            } else {
                // Export the current viewport as-is
                const canvasEl = document.querySelector('.react-flow') as HTMLElement;
                if (!canvasEl) return;

                const filterNodes = (node: HTMLElement) => {
                    const cls = node?.classList;
                    if (!cls) return true;
                    if (cls.contains('react-flow__controls')) return false;
                    if (cls.contains('react-flow__minimap')) return false;
                    if (cls.contains('react-flow__panel')) return false;
                    if (cls.contains('react-flow__background')) return false;
                    return true;
                };

                const exportOptions = {
                    backgroundColor: bgColor,
                    pixelRatio: format === 'png' ? pixelRatio : 1,
                    filter: filterNodes,
                };

                const dataUrl = format === 'png'
                    ? await toPng(canvasEl, exportOptions)
                    : await toSvg(canvasEl, exportOptions);

                downloadImage(dataUrl, format);
            }
        } catch (err) {
            console.error('Snapshot export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const downloadImage = (dataUrl: string, ext: string) => {
        const a = document.createElement('a');
        const resStr = ext === 'png' ? `-${pixelRatio}x` : '';
        a.download = `flowwand-${scope}${resStr}-${Date.now()}.${ext}`;
        a.href = dataUrl;
        a.click();
    };

    return (
        <div className="event-dispatcher" style={{ width: '280px' }}>
            <div className="ed-header">
                <div className="ed-title">
                    <Camera size={14} style={{ color: 'var(--purple-light)' }} />
                    <span>Export Snapshot</span>
                </div>
                <button className="ed-close" onClick={onClose}>
                    <X size={14} />
                </button>
            </div>

            {/* Scope Selection */}
            <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                    Export Area
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {SCOPES.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setScope(s.id)}
                            style={{
                                flex: 1,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                padding: '10px 8px',
                                background: scope === s.id ? 'color-mix(in srgb, var(--purple) 15%, transparent)' : 'var(--bg-tertiary)',
                                border: `1px solid ${scope === s.id ? 'var(--purple)' : 'var(--border-default)'}`,
                                borderRadius: 'var(--radius-sm)',
                                color: scope === s.id ? 'var(--purple-light)' : 'var(--text-secondary)',
                                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.2s', fontFamily: 'inherit',
                            }}
                        >
                            <s.icon size={16} />
                            <span>{s.label}</span>
                            <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 400 }}>{s.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Format Selection */}
            <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                    Format
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                        onClick={() => setFormat('svg')}
                        style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '8px',
                            background: format === 'svg' ? 'color-mix(in srgb, var(--emerald) 15%, transparent)' : 'var(--bg-tertiary)',
                            border: `1px solid ${format === 'svg' ? 'var(--emerald)' : 'var(--border-default)'}`,
                            borderRadius: 'var(--radius-sm)',
                            color: format === 'svg' ? 'var(--emerald)' : 'var(--text-secondary)',
                            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s', fontFamily: 'inherit',
                        }}
                    >
                        <FileCode size={14} />
                        <span>SVG (Vector)</span>
                    </button>
                    <button
                        onClick={() => setFormat('png')}
                        style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '8px',
                            background: format === 'png' ? 'color-mix(in srgb, var(--purple) 15%, transparent)' : 'var(--bg-tertiary)',
                            border: `1px solid ${format === 'png' ? 'var(--purple)' : 'var(--border-default)'}`,
                            borderRadius: 'var(--radius-sm)',
                            color: format === 'png' ? 'var(--purple)' : 'var(--text-secondary)',
                            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s', fontFamily: 'inherit',
                        }}
                    >
                        <ImageIcon size={14} />
                        <span>PNG (Image)</span>
                    </button>
                </div>
            </div>

            {/* Resolution Selection - Only for PNG */}
            {format === 'png' && (
                <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                        Resolution
                    </label>
                    <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
                        {RESOLUTIONS.map(r => (
                            <button
                                key={r.value}
                                onClick={() => setPixelRatio(r.value)}
                                style={{
                                    flex: 1,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                                    padding: '6px 4px',
                                    background: pixelRatio === r.value ? 'var(--purple)' : 'transparent',
                                    color: pixelRatio === r.value ? '#fff' : 'var(--text-secondary)',
                                    border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.2s', fontFamily: 'inherit',
                                }}
                            >
                                <span>{r.label}</span>
                                <span style={{ fontSize: '8px', fontWeight: 400, opacity: 0.7 }}>{r.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Export Button */}
            <button
                onClick={handleExport}
                disabled={isExporting}
                style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '10px 16px',
                    background: isExporting ? 'var(--bg-elevated)' : (format === 'svg' ? 'var(--emerald)' : 'var(--purple)'),
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                    cursor: isExporting ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isExporting ? 'none' : (format === 'svg' ? '0 4px 16px var(--emerald-glow)' : '0 4px 16px var(--purple-glow)'),
                }}
            >
                <Download size={14} />
                <span>{isExporting ? 'Exporting...' : `Download ${format.toUpperCase()}`}</span>
            </button>
        </div>
    );
};

export default SnapshotPanel;
