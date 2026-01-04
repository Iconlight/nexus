import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../constants/Theme';
import { ModernCard } from './ModernCard';

export type UserListItem = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    description?: string; // For status details (e.g., "Check-in: 09:00 AM", "Sick Leave")
    avatarUrl?: string; // Optional if we have avatars
};

type UserListModalProps = {
    visible: boolean;
    onClose: () => void;
    title: string;
    users: UserListItem[];
    loading?: boolean;
    emptyMessage?: string;
};

export default function UserListModal({ visible, onClose, title, users, loading, emptyMessage = "No users found" }: UserListModalProps) {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : users.length === 0 ? (
                        <View style={styles.centerBox}>
                            <Text style={styles.emptyText}>{emptyMessage}</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={users}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            renderItem={({ item }) => (
                                <ModernCard style={styles.userCard}>
                                    <View style={styles.row}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{item.first_name[0]}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
                                            <Text style={styles.userEmail}>{item.email}</Text>
                                        </View>
                                        {item.description && (
                                            <View style={styles.descBadge}>
                                                <Text style={styles.descText}>{item.description}</Text>
                                            </View>
                                        )}
                                    </View>
                                </ModernCard>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%',
        elevation: 10,
        shadowColor: theme.shadows.medium.shadowColor,
        shadowOffset: theme.shadows.medium.shadowOffset,
        shadowOpacity: theme.shadows.medium.shadowOpacity,
        shadowRadius: theme.shadows.medium.shadowRadius,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 12,
    },
    centerBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.text.muted,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    userCard: {
        marginBottom: 12,
        padding: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    userEmail: {
        fontSize: 12,
        color: theme.colors.text.secondary,
    },
    descBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    descText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.text.secondary,
    },
});
