import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Alert, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../constants/Theme';
import { ModernCard } from './ModernCard';

type Leader = {
    id: string; // profile_id
    first_name: string;
    last_name: string;
    role: string;
};

type ManageLeadersModalProps = {
    visible: boolean;
    onClose: () => void;
    teamId: string;
    teamName: string;
    eligibleManagers: Leader[];
    onUpdate: () => void; // Refresh parent data
};

export default function ManageLeadersModal({ visible, onClose, teamId, teamName, eligibleManagers, onUpdate }: ManageLeadersModalProps) {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [currentLeaders, setCurrentLeaders] = useState<Leader[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && teamId) {
            loadLeaders();
        }
    }, [visible, teamId]);

    async function loadLeaders() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('team_managers')
                .select(`
                    id,
                    manager_id,
                    profiles:manager_id (id, first_name, last_name, role)
                `)
                .eq('team_id', teamId);

            if (error) throw error;

            const leaders = data.map((item: any) => item.profiles).filter(Boolean);
            setCurrentLeaders(leaders);
        } catch (error) {
            console.error('Error loading leaders:', error);
        } finally {
            setLoading(false);
        }
    }

    async function addLeader(managerId: string) {
        const candidate = eligibleManagers.find(e => e.id === managerId);

        if (candidate?.role === 'employee') {
            const confirmMsg = `Promote ${candidate.first_name} to Manager? They must be a manager to lead a department.`;

            if (Platform.OS === 'web') {
                if (window.confirm(confirmMsg)) {
                    performAddLeader(managerId, true);
                }
            } else {
                Alert.alert(
                    'Promote Employee',
                    confirmMsg,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Promote & Assign',
                            onPress: () => performAddLeader(managerId, true)
                        }
                    ]
                );
            }
            return;
        }

        performAddLeader(managerId, false);
    }

    async function performAddLeader(managerId: string, promote: boolean) {
        setLoading(true);
        try {
            if (promote) {
                const { error: promoError } = await supabase
                    .from('profiles')
                    .update({ role: 'manager' })
                    .eq('id', managerId);

                if (promoError) throw promoError;
            }

            const { error } = await supabase
                .from('team_managers')
                .insert({
                    team_id: teamId,
                    manager_id: managerId
                });

            if (error) throw error;
            loadLeaders();
            onUpdate();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add leader');
        } finally {
            setLoading(false);
        }
    }

    async function removeLeader(managerId: string) {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('team_managers')
                .delete()
                .eq('team_id', teamId)
                .eq('manager_id', managerId);

            if (error) throw error;
            loadLeaders();
            onUpdate();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to remove leader');
        } finally {
            setLoading(false);
        }
    }

    const availableManagers = eligibleManagers.filter(
        emp => !currentLeaders.some(leader => leader.id === emp.id)
    );

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
                        <View>
                            <Text style={styles.title}>Department Leaders</Text>
                            <Text style={styles.subtitle}>{teamName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionHeader}>ASSIGNED MANAGERS</Text>
                        {currentLeaders.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No leaders assigned</Text>
                            </View>
                        ) : (
                            currentLeaders.map(item => (
                                <ModernCard key={item.id} style={styles.userCard}>
                                    <View style={styles.userInfo}>
                                        <View style={styles.avatarMini}>
                                            <Text style={styles.avatarTextMini}>{item.first_name[0]}</Text>
                                        </View>
                                        <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeBtn}
                                        onPress={() => removeLeader(item.id)}
                                        disabled={loading}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                                    </TouchableOpacity>
                                </ModernCard>
                            ))
                        )}

                        <Text style={[styles.sectionHeader, { marginTop: 24 }]}>AVAILABLE TO ASSIGN</Text>
                        {availableManagers.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No other managers available</Text>
                            </View>
                        ) : (
                            availableManagers.map(item => (
                                <ModernCard key={item.id} style={styles.userCard}>
                                    <View style={styles.userInfo}>
                                        <View style={[styles.avatarMini, { backgroundColor: theme.colors.info }]}>
                                            <Text style={styles.avatarTextMini}>{item.first_name[0]}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
                                            <Text style={styles.userRole}>{item.role.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.addBtn}
                                        onPress={() => addLeader(item.id)}
                                        disabled={loading}
                                    >
                                        <Ionicons name="add" size={20} color={theme.colors.primary} />
                                        <Text style={styles.addBtnText}>ADD</Text>
                                    </TouchableOpacity>
                                </ModernCard>
                            ))
                        )}
                        {loading && <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />}
                        <View style={{ height: 20 }} />
                    </ScrollView>
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
        padding: 20,
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 24,
        maxHeight: '85%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '600',
        marginTop: 2,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 12,
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.text.muted,
        marginBottom: 12,
        letterSpacing: 1,
    },
    emptyBox: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    emptyText: {
        color: theme.colors.text.muted,
        fontSize: 13,
        fontStyle: 'italic',
    },
    userCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarMini: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarTextMini: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    userRole: {
        fontSize: 10,
        color: theme.colors.text.muted,
        marginTop: 1,
    },
    removeBtn: {
        padding: 8,
        backgroundColor: theme.colors.error + '10',
        borderRadius: 8,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.colors.primary + '10',
        borderRadius: 8,
        gap: 4,
    },
    addBtnText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
});
