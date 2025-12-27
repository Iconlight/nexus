import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Button, FlatList, Alert, Platform } from 'react-native';
import { supabase } from '../services/supabase';

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
            // Web compatible confirm
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
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Manage Leaders: {teamName}</Text>
                        <Button title="Close" onPress={onClose} />
                    </View>

                    <Text style={styles.sectionTitle}>Current Leaders</Text>
                    {currentLeaders.length === 0 ? (
                        <Text style={styles.emptyText}>No leaders assigned</Text>
                    ) : (
                        <FlatList
                            data={currentLeaders}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.userRow}>
                                    <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
                                    <Button title="Remove" color="#f44336" onPress={() => removeLeader(item.id)} disabled={loading} />
                                </View>
                            )}
                        />
                    )}

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Available Managers</Text>
                    {availableManagers.length === 0 ? (
                        <Text style={styles.emptyText}>No other managers available</Text>
                    ) : (
                        <FlatList
                            data={availableManagers}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.userRow}>
                                    <View>
                                        <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
                                        <Text style={styles.userRole}>{item.role}</Text>
                                    </View>
                                    <Button title="Add" onPress={() => addLeader(item.id)} disabled={loading} />
                                </View>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        maxHeight: '80%',
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
        color: '#333',
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 8,
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
        marginBottom: 12,
    },
    userRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    userRole: {
        fontSize: 12,
        color: '#999',
    },
});
