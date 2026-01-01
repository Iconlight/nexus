import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/Theme';
import { ModernCard } from './ModernCard';

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    team_id: string | null;
    role: string;
};

type AddMemberModalProps = {
    visible: boolean;
    onClose: () => void;
    teamId: string;
    onUpdate: () => void;
};

export default function AddMemberModal({ visible, onClose, teamId, onUpdate }: AddMemberModalProps) {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            loadAvailableEmployees();
        }
    }, [visible]);

    async function loadAvailableEmployees() {
        setLoading(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, team_id, role')
                .eq('company_id', profile.company_id)
                .neq('team_id', teamId)
                .order('first_name');

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error loading employees:', error);
            Alert.alert('Error', 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    }

    async function addMember(employeeId: string) {
        setAddingId(employeeId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ team_id: teamId })
                .eq('id', employeeId);

            if (error) throw error;

            if (Platform.OS === 'web') {
                alert('Member added to department');
            } else {
                Alert.alert('Success', 'Member added to department');
            }
            onUpdate();
            loadAvailableEmployees();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add member');
        } finally {
            setAddingId(null);
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Add Member</Text>
                            <Text style={styles.subtitle}>Assign employees to department</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={24} color={THEME.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color={THEME.colors.primary} />
                        </View>
                    ) : employees.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={48} color={THEME.colors.text.muted + '40'} />
                            <Text style={styles.emptyText}>No available employees found</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={employees}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <ModernCard style={styles.userCard}>
                                    <View style={styles.userInfo}>
                                        <View style={styles.avatarMini}>
                                            <Text style={styles.avatarTextMini}>{item.first_name[0]}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
                                            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.addBtn, addingId === item.id && styles.addBtnDisabled]}
                                        onPress={() => addMember(item.id)}
                                        disabled={!!addingId}
                                    >
                                        {addingId === item.id ? (
                                            <ActivityIndicator size="small" color={THEME.colors.primary} />
                                        ) : (
                                            <>
                                                <Ionicons name="add" size={18} color={THEME.colors.primary} />
                                                <Text style={styles.addBtnText}>ADD</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </ModernCard>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%',
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
        fontSize: 22,
        fontWeight: 'bold',
        color: THEME.colors.text.primary,
    },
    subtitle: {
        fontSize: 13,
        color: THEME.colors.text.muted,
        marginTop: 2,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
    },
    loadingBox: {
        padding: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        color: THEME.colors.text.muted,
        fontSize: 15,
    },
    userCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        marginBottom: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatarMini: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: THEME.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarTextMini: {
        color: THEME.colors.primary,
        fontSize: 15,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: THEME.colors.text.primary,
    },
    userEmail: {
        fontSize: 11,
        color: THEME.colors.text.muted,
        marginTop: 1,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: THEME.colors.primary + '10',
        borderRadius: 10,
        gap: 4,
        minWidth: 70,
        justifyContent: 'center',
    },
    addBtnDisabled: {
        opacity: 0.5,
    },
    addBtnText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: THEME.colors.primary,
    },
});
