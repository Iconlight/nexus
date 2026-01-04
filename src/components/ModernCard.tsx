import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps, StyleProp } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ModernCardProps extends ViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'soft' | 'medium';
}

export const ModernCard: React.FC<ModernCardProps> = ({ children, style, variant = 'soft', ...props }) => {
    const { theme } = useTheme();

    return (
        <View
            style={[
                {
                    backgroundColor: theme.colors.card,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.md,
                },
                variant === 'medium' ? theme.shadows.medium : theme.shadows.soft,
                style
            ]}
            {...props}
        >
            {children}
        </View>
    );
};
