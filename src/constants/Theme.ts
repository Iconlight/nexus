export const LightTheme = {
    colors: {
        primary: '#7C4DFF', // Deep Purple
        secondary: '#651FFF',
        success: '#00E676', // Vibrant Green
        info: '#2196F3', // Soft Blue
        warning: '#FF9100', // Orange
        error: '#FF1744', // Red
        background: '#F8F9FA', // Very light grey/white
        card: '#FFFFFF', // Solid White
        text: {
            primary: '#1A1A1A',
            secondary: '#757575',
            muted: '#BDBDBD',
            onPrimary: '#FFFFFF',
        },
        border: '#EEEEEE',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        round: 9999,
    },
    shadows: {
        soft: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 15,
            elevation: 4,
        },
    }
};

export const DarkTheme = {
    ...LightTheme,
    colors: {
        ...LightTheme.colors,
        background: '#121212', // Dark background
        card: '#1E1E1E', // Dark card
        text: {
            primary: '#E0E0E0',
            secondary: '#B0BEC5',
            muted: '#757575',
            onPrimary: '#000000',
        },
        border: '#333333',
    }
};

// Deprecated: Use useTheme() instead
export const THEME = LightTheme;
