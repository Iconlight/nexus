import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps, StyleProp } from 'react-native';
import { THEME } from '../constants/Theme';

interface ModernCardProps extends ViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'soft' | 'medium';
}

export const ModernCard: React.FC<ModernCardProps> = ({ children, style, variant = 'soft', ...props }) => {
    return (
        <View
            style={[
                styles.card,
                variant === 'medium' ? THEME.shadows.medium : THEME.shadows.soft,
                style
            ]}
            {...props}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: THEME.colors.card,
        borderRadius: THEME.borderRadius.lg,
        padding: THEME.spacing.md,
    },
});
