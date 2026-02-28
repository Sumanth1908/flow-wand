import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode: 'light' | 'dark') => ({
    palette: {
        mode,
        ...(mode === 'dark'
            ? {
                primary: {
                    main: '#6366f1',
                    light: '#818cf8',
                },
                secondary: {
                    main: '#f59e0b',
                    light: '#fbbf24',
                },
                success: {
                    main: '#10b981',
                    light: '#34d399',
                },
                error: {
                    main: '#ef4444',
                    light: '#f87171',
                },
                background: {
                    default: '#131b2e',
                    paper: '#0a0e1a',
                },
                text: {
                    primary: '#f1f5f9',
                    secondary: '#94a3b8',
                },
            }
            : {
                primary: {
                    main: '#4f46e5',
                    light: '#6366f1',
                },
                secondary: {
                    main: '#d97706',
                    light: '#f59e0b',
                },
                success: {
                    main: '#059669',
                    light: '#10b981',
                },
                error: {
                    main: '#dc2626',
                    light: '#ef4444',
                },
                background: {
                    default: '#f1f5f9',
                    paper: '#ffffff',
                },
                text: {
                    primary: '#0f172a',
                    secondary: '#475569',
                },
            }),
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        button: {
            textTransform: 'none' as const,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
});

export const createAppTheme = (mode: 'light' | 'dark') => createTheme(getDesignTokens(mode));
