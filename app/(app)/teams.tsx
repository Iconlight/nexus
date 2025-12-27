import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import ManageLeadersModal from '../../src/components/ManageLeadersModal';

type Team = {
    id: string;
    name: string;
    description: string;
    created_at: string;
    manager_count?: number;
    member_count?: number;
};

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
};

export default function Teams() {
    const { user } = useAuth();
    const router = useRouter(); // Initialize router
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Form state
    const [teamName, setTeamName] = useState('');
    const [teamDescription, setTeamDescription] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            // Load teams
            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('*')
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false });

            if (teamsError) throw teamsError;
            setTeams(teamsData || []);

            // Load employees for manager assignment
            const { data: employeesData, error: employeesError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, role')
                .eq('company_id', profile.company_id)
                .in('role', ['employee', 'manager']);

            if (employeesError) throw employeesError;
            console.log('Fetched eligible employees:', employeesData?.length, employeesData?.map(e => `${e.first_name} (${e.role})`));
            setEmployees(employeesData || []);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function createTeam() {
        if (!teamName) {
            const msg = 'Please enter a department name';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
            return;
        }

        setCreating(true);

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) {
                throw new Error('Company not found');
            }

            const { error } = await supabase
                .from('teams')
                .insert({
                    company_id: profile.company_id,
                    name: teamName,
                    description: teamDescription,
                });

            if (error) throw error;

            const msg = 'Department created successfully!';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            setTeamName('');
            setTeamDescription('');
            setShowCreateForm(false);

            loadData();
        } catch (error: any) {
            const msg = error.message || 'Failed to create team';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setCreating(false);
        }
    }

    async function deleteTeam(teamId: string) {
        const confirmMsg = 'Are you sure you want to delete this department?';
        const confirmed = Platform.OS === 'web'
            ? window.confirm(confirmMsg)
            : await new Promise((resolve) => {
                Alert.alert(
                    'Confirm Delete',
                    confirmMsg,
                    [
                        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                        { text: 'Delete', onPress: () => resolve(true), style: 'destructive' },
                    ]
                );
            });

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamId);

            if (error) throw error;

            const msg = 'Department deleted successfully';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            loadData();
        } catch (error: any) {
            const msg = error.message || 'Failed to delete team';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading departments...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Department Management</Text>
                <Button
                    title={showCreateForm ? "Cancel" : "Create Department"}
                    onPress={() => setShowCreateForm(!showCreateForm)}
                />
            </View>

            {showCreateForm && (
                <View style={styles.createForm}>
                    <Text style={styles.formTitle}>Create New Department</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Department Name *"
                        value={teamName}
                        onChangeText={setTeamName}
                    />

                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Description (optional)"
                        value={teamDescription}
                        onChangeText={setTeamDescription}
                        multiline
                        numberOfLines={3}
                    />

                    <Button
                        title={creating ? "Creating..." : "Create Department"}
                        onPress={createTeam}
                        disabled={creating}
                    />
                </View>
            )}

            <View style={styles.teamsList}>
                <Text style={styles.sectionTitle}>Departments ({teams.length})</Text>

                {teams.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No departments created yet</Text>
                    </View>
                ) : (
                    teams.map((team) => (
                        <View key={team.id} style={styles.teamCard}>
                            <View style={styles.teamHeader}>
                                <View style={styles.teamInfo}>
                                    <Text style={styles.teamName}>{team.name}</Text>
                                    {team.description && (
                                        <Text style={styles.teamDescription}>{team.description}</Text>
                                    )}
                                    <Text style={styles.teamDate}>
                                        Created: {new Date(team.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.teamActions}>
                                <Button
                                    title="Manage Department"
                                    onPress={() => router.push(`/(app)/teams/${team.id}`)}
                                    color="#2196f3"
                                />
                                <Button
                                    title="Delete"
                                    onPress={() => deleteTeam(team.id)}
                                    color="#f44336"
                                />
                            </View>
                        </View>
                    ))
                )}
            </View>


        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: 'white',
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    createForm: {
        backgroundColor: 'white',
        margin: 16,
        padding: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    teamsList: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    teamCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    teamHeader: {
        marginBottom: 12,
    },
    teamInfo: {
        flex: 1,
    },
    teamName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    teamDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    teamDate: {
        fontSize: 12,
        color: '#999',
    },
    teamActions: {
        flexDirection: 'row',
        gap: 8,
    },
});
