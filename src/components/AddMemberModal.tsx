import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Button, FlatList, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    team_id: string | null;
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
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (visible) {
            loadAvailableEmployees();
        }
    }, [visible]);

    async function loadAvailableEmployees() {
        setLoading(true);
        try {
            // Get current user's company
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            // Fetch employees in the company who are NOT in this team
            // Optional: You might want to filter only employees with NO team, or allow stealing from other teams.
            // For now, let's fetch everyone not in the current team.
            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, team_id')
                .eq('company_id', profile.company_id)
                .neq('team_id', teamId) // Not already in this team
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
        setAdding(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ team_id: teamId })
                .eq('id', employeeId);

            if (error) throw error;

            Alert.alert('Success', 'Member added to department');
            onUpdate();
            loadAvailableEmployees(); // Refresh list
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add member');
        } finally {
            setAdding(false);
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Add Member to Team</Text>
                        <Button title="Close" onPress={onClose} />
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#2196f3" />
                    ) : employees.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No available employees found.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={employees}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.row}>
                                    <View style={styles.info}>
                                        <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
                                        <Text style={styles.email}>{item.email}</Text>
                                    </View>
                                    <Button
                                        title={adding ? "..." : "Add"}
                                        onPress={() => addMember(item.id)}
                                        disabled={adding}
                                    />
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
        padding: 20,
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
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    email: {
        fontSize: 12,
        color: '#666',
    },
});
