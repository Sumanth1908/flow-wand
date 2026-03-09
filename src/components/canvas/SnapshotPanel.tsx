/**
 * components/canvas/SnapshotPanel.tsx
 */
import React, { useState } from 'react';
import { useReactFlow, getViewportForBounds } from '@xyflow/react';
import { Download, Monitor, Layers, Image as ImageIcon, FileCode } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { Box, Typography, Stack, Button, Divider, useTheme } from '@mui/material';

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
    { id: 'viewport', label: 'Current View', icon: Monitor, desc: 'Export visible area' },
    { id: 'all', label: 'All Nodes', icon: Layers, desc: 'Capture entire graph' },
] as const;

type Scope = typeof SCOPES[number]['id'];

const SnapshotPanel: React.FC<SnapshotPanelProps> = ({ onClose }) => {
    const [scope, setScope] = useState<Scope>('all');
    const [format, setFormat] = useState<'png' | 'svg'>('png');
    const [pixelRatio, setPixelRatio] = useState(2);
    const [isExporting, setIsExporting] = useState(false);
    const { getNodes, getNodesBounds } = useReactFlow();
    const theme = useTheme();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement;
            if (!viewportEl) {
                console.error("React Flow viewport element not found");
                return;
            }

            const bgColor = theme.palette.background.default || '#0a0e1a';

            const filterNodes = (node: HTMLElement) => {
                const cls = node?.classList;
                if (!cls) return true;
                if (cls.contains('react-flow__controls')) return false;
                if (cls.contains('react-flow__minimap')) return false;
                if (cls.contains('react-flow__panel')) return false;
                if (cls.contains('react-flow__background')) return false;
                return true;
            };

            if (scope === 'all') {
                const allNodes = getNodes();
                if (allNodes.length === 0) return;

                // getNodesBounds handles everything, but we ensure we have at least some size
                const nodesBounds = getNodesBounds(allNodes);
                const padding = 80;
                
                // We want a high-fidelity export, so we force zoom to be at least 1.0
                // This prevents the "tiny cluster in a sea of white" issue.
                const imageWidth = nodesBounds.width + padding * 2;
                const imageHeight = nodesBounds.height + padding * 2;

                const viewport = getViewportForBounds(
                    nodesBounds,
                    imageWidth,
                    imageHeight,
                    1.0,  // minZoom: Don't let it be tiny
                    4,    // maxZoom
                    padding,
                );

                const exportOptions = {
                    backgroundColor: bgColor,
                    width: imageWidth,
                    height: imageHeight,
                    pixelRatio: format === 'png' ? pixelRatio : 1,
                    filter: filterNodes,
                    skipFonts: true, // Fixes SecurityError with remote Google Fonts CSS
                    style: {
                        width: `${imageWidth}px`,
                        height: `${imageHeight}px`,
                        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                        transformOrigin: '0 0',
                    },
                };

                const dataUrl = format === 'png'
                    ? await toPng(viewportEl, exportOptions)
                    : await toSvg(viewportEl, exportOptions);

                downloadImage(dataUrl, format);
            } else {
                const canvasEl = document.querySelector('.react-flow') as HTMLElement;
                if (!canvasEl) return;

                const exportOptions = {
                    backgroundColor: bgColor,
                    pixelRatio: format === 'png' ? pixelRatio : 1,
                    filter: filterNodes,
                    skipFonts: true, // Fixes SecurityError with remote Google Fonts CSS
                };

                const dataUrl = format === 'png'
                    ? await toPng(canvasEl, exportOptions)
                    : await toSvg(canvasEl, exportOptions);

                downloadImage(dataUrl, format);
            }
            onClose();
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
        
        // Use Blob for SVGs to avoid length limits in data URLs
        if (ext === 'svg') {
            let svgContent = decodeURIComponent(dataUrl.replace('data:image/svg+xml;charset=utf-8,', ''));
            
            // Fix SVG so it's scalable (infinite zoom) instead of fixed dimensions
            svgContent = svgContent.replace(/<svg\s+([^>]*?)>/, (match, attrs) => {
                const widthMatch = attrs.match(/width=(["'])([^"']+)\1/);
                const heightMatch = attrs.match(/height=(["'])([^"']+)\1/);
                if (widthMatch && heightMatch) {
                    const w = parseFloat(widthMatch[2]);
                    const h = parseFloat(heightMatch[2]);
                    let newAttrs = attrs
                        .replace(/width=(["'])(.*?)\1/i, 'width="100%"')
                        .replace(/height=(["'])(.*?)\1/i, 'height="100%"')
                        .replace(/viewBox=(["'])(.*?)\1/gi, ''); // Prevent duplicate viewBox error

                    // Also remove any stray spaces left over if multiple replacements happened
                    newAttrs = newAttrs.trim();

                    return `<svg viewBox="0 0 ${w} ${h}" ${newAttrs}>`;
                }
                return match;
            });

            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            a.href = dataUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    return (
        <Stack spacing={4} sx={{ mt: 1 }}>
            <Box>
                <Typography variant="overline" color="text.secondary" fontWeight="900" sx={{ display: 'block', mb: 1, letterSpacing: 1.2 }}>Capture Scope</Typography>
                <Stack direction="row" spacing={2}>
                    {SCOPES.map(s => (
                        <Button
                            key={s.id}
                            onClick={() => setScope(s.id)}
                            variant={scope === s.id ? 'contained' : 'outlined'}
                            sx={{
                                flex: 1, display: 'flex', flexDirection: 'column', p: 2, height: 'auto',
                                textTransform: 'none', borderRadius: 2,
                                borderColor: scope === s.id ? 'primary.main' : 'divider',
                                bgcolor: scope === s.id ? 'primary.main' : 'background.paper',
                                color: scope === s.id ? 'primary.contrastText' : 'text.primary',
                                '&:hover': {
                                    bgcolor: scope === s.id ? 'primary.dark' : 'action.hover',
                                }
                            }}
                        >
                            <s.icon size={24} style={{ marginBottom: 8 }} />
                            <Typography variant="body2" fontWeight="bold">{s.label}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>{s.desc}</Typography>
                        </Button>
                    ))}
                </Stack>
            </Box>

            <Divider />

            <Stack direction="row" spacing={4}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight="900" sx={{ letterSpacing: 1.2, display: 'block', mb: 2 }}>Export Format</Typography>
                    <Stack spacing={1}>
                        <Button
                            fullWidth
                            onClick={() => setFormat('png')}
                            variant={format === 'png' ? 'contained' : 'outlined'}
                            color="secondary"
                            startIcon={<ImageIcon size={18} />}
                            sx={{ justifyContent: 'flex-start', py: 1, px: 2, borderRadius: 1.5 }}
                        >
                            PNG (Raster Image)
                        </Button>
                        <Button
                            fullWidth
                            onClick={() => setFormat('svg')}
                            variant={format === 'svg' ? 'contained' : 'outlined'}
                            color="success"
                            startIcon={<FileCode size={18} />}
                            sx={{ justifyContent: 'flex-start', py: 1, px: 2, borderRadius: 1.5 }}
                        >
                            SVG (Vector Graphics)
                        </Button>
                    </Stack>
                </Box>

                <Box sx={{ flex: 1 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight="900" sx={{ letterSpacing: 1.2, display: 'block', mb: 2 }}>Settings</Typography>
                    {format === 'png' ? (
                        <Box>
                            <Typography variant="body2" fontWeight="600" sx={{ mb: 1.5 }}>PNG Resolution</Typography>
                            <Stack direction="row" sx={{ bgcolor: 'action.hover', borderRadius: 1.5, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                                {RESOLUTIONS.map(r => (
                                    <Button
                                        key={r.value}
                                        onClick={() => setPixelRatio(r.value)}
                                        sx={{
                                            flex: 1, p: 1, minWidth: 0,
                                            borderRadius: 0, height: 'auto', borderRight: r.value !== 4 ? 1 : 0, borderColor: 'divider',
                                            bgcolor: pixelRatio === r.value ? 'primary.main' : 'transparent',
                                            color: pixelRatio === r.value ? 'primary.contrastText' : 'text.secondary',
                                            '&:hover': { bgcolor: pixelRatio === r.value ? 'primary.dark' : 'action.hover' },
                                        }}
                                    >
                                        <Stack alignItems="center">
                                            <Typography variant="caption" fontWeight="900">{r.label}</Typography>
                                            <Typography variant="caption" sx={{ fontSize: 9 }}>{r.desc}</Typography>
                                        </Stack>
                                    </Button>
                                ))}
                            </Stack>
                        </Box>
                    ) : (
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary">
                                SVGs are always exported at 1:1 scale with infinite crispness. Resolution settings do not apply.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Stack>

            <Box sx={{ pt: 1 }}>
                <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<Download size={20} />}
                    sx={{
                        py: 2, fontWeight: 'bold', borderRadius: 2,
                        boxShadow: '0 4px 14px 0 rgba(0,0,0,0.2)',
                    }}
                >
                    {isExporting ? 'Generating high-res snapshot...' : `Download ${format.toUpperCase()} Snapshot`}
                </Button>
            </Box>
        </Stack>
    );
};

export default SnapshotPanel;
