import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { THEME } from '../constants/Theme';

interface ProgressRingProps {
    progress: number; // 0 to 1
    size?: number;
    strokeWidth?: number;
    color?: string;
    children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
    progress,
    size = 120,
    strokeWidth = 12,
    color = THEME.colors.success,
    children
}) => {
    const radius = (size - strokeWidth) / 2;
    // Note: React Native's border rendering is limited for complex arcs.
    // We'll use a simplified version with a full background ring and a semi-circle approach
    // or just a nice themed container if visual complexity is too high for pure views.

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Background Circle */}
            <View style={[
                styles.backgroundRing,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: strokeWidth
                }
            ]} />

            {/* Progress Arc - Simplified for RN View */}
            {/* For a true arc we'd need SVG, but we can simulate a partial ring with borders */}
            <View style={[
                styles.progressArc,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: strokeWidth,
                    borderColor: color,
                    borderTopColor: 'transparent',
                    borderLeftColor: 'transparent',
                    transform: [{ rotate: `${(progress * 360) - 45}deg` }]
                }
            ]} />

            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    backgroundRing: {
        position: 'absolute',
        borderColor: '#F0F0F0',
    },
    progressArc: {
        position: 'absolute',
    },
    content: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});
