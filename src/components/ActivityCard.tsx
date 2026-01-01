import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/Theme';
import { ModernCard } from './ModernCard';

interface ActivityCardProps {
    title: string;
    value: string;
    unit?: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    progress?: number;
    onPress?: () => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
    title,
    value,
    unit,
    icon,
    color,
    progress,
    onPress
}) => {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={styles.cardContainer}
            disabled={!onPress}
        >
            <ModernCard style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
                        <Ionicons name={icon} size={20} color={color} />
                    </View>
                </View>

                <View style={styles.bottom}>
                    <View>
                        <Text style={styles.value}>{value}</Text>
                        {unit && <Text style={styles.unit}>{unit}</Text>}
                    </View>
                    {progress !== undefined && (
                        <View style={styles.miniProgress}>
                            <View style={[styles.progressBg, { backgroundColor: `${color}20` }]}>
                                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
                            </View>
                        </View>
                    )}
                </View>
            </ModernCard>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: '48%',
        marginBottom: THEME.spacing.md,
    },
    card: {
        height: 140,
        justifyContent: 'space-between',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.colors.text.secondary,
    },
    iconBox: {
        padding: 6,
        borderRadius: 12,
    },
    bottom: {
        gap: 8,
    },
    value: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME.colors.text.primary,
    },
    unit: {
        fontSize: 12,
        color: THEME.colors.text.muted,
    },
    miniProgress: {
        height: 6,
        width: '100%',
    },
    progressBg: {
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    }
});

