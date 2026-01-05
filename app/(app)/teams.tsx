import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';

type Team = {
    id: string;
    name: string;
    description: string;
    created_at: string;
};

export default function Teams() {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const router = useRouter();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [teams, setTeams] = useState<Team[]>([]);
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
            const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user?.id).single();
            if (!profile?.company_id) return;

            if (profile.role === 'manager') {
                const { data: managerData } = await supabase.from('team_managers').select('team_id').eq('manager_id', user?.id).single();
                if (managerData) {
                    router.replace(`/(app)/teams/${managerData.team_id}`);
                    return;
                }
            }

            const { data, error } = await supabase.from('teams').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false });
            if (error) throw error;
            setTeams(data || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function createTeam() {
        if (!teamName) {
            Platform.OS === 'web' ? alert('Name required') : Alert.alert('Error', 'Name required');
            return;
        }

        setCreating(true);
        try {
            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
            if (!profile?.company_id) throw new Error('Company not found');

            const { error } = await supabase.from('teams').insert({ company_id: profile.company_id, name: teamName, description: teamDescription });
            if (error) throw error;

            setTeamName('');
            setTeamDescription('');
            setShowCreateForm(false);
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setCreating(false);
        }
    }

    async function deleteTeam(teamId: string) {
        const confirmed = Platform.OS === 'web' ? window.confirm('Delete this department?') : await new Promise(r => Alert.alert('Confirm', 'Delete this department?', [{ text: 'Cancel', onPress: () => r(false) }, { text: 'Delete', onPress: () => r(true), style: 'destructive' }]));
        if (!confirmed) return;

        try {
            const { error } = await supabase.from('teams').delete().eq('id', teamId);
            if (error) throw error;
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.createToggle, { backgroundColor: showCreateForm ? theme.colors.error : theme.colors.primary }]}
                    onPress={() => setShowCreateForm(!showCreateForm)}
                >
                    <Ionicons name={showCreateForm ? "close" : "add"} size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {showCreateForm && (
                    <ModernCard style={styles.formCard}>
                        <Text style={styles.formHeading}>New Department</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Department Name *"
                            value={teamName}
                            onChangeText={setTeamName}
                            placeholderTextColor={theme.colors.text.muted}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Description (optional)"
                            value={teamDescription}
                            onChangeText={setTeamDescription}
                            multiline
                            numberOfLines={3}
                            placeholderTextColor={theme.colors.text.muted}
                        />
                        <TouchableOpacity style={styles.submitBtn} onPress={createTeam} disabled={creating}>
                            {creating ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Create Department</Text>}
                        </TouchableOpacity>
                    </ModernCard>
                )}

                {teams.length === 0 ? (
                    <View style={styles.emptyCenter}>
                        <Ionicons name="business-outline" size={64} color={theme.colors.text.muted} />
                        <Text style={styles.emptyText}>No departments found</Text>
                    </View>
                ) : (
                    teams.map((team) => (
                        <TouchableOpacity key={team.id} activeOpacity={0.9} onPress={() => router.push(`/(app)/teams/${team.id}`)}>
                            <ModernCard style={styles.teamCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="business" size={24} color={theme.colors.primary} />
                                    </View>
                                    <View style={styles.teamInfo}>
                                        <Text style={styles.teamName}>{team.name}</Text>
                                        <Text style={styles.teamDate}>Since {new Date(team.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity onPress={() => deleteTeam(team.id)} style={styles.deleteBtn}>
                                            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {team.description && (
                                    <Text style={styles.teamDescription} numberOfLines={2}>{team.description}</Text>
                                )}
                                <View style={styles.cardFooter}>
                                    <Text style={styles.manageText}>View Details</Text>
                                    <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                                </View>
                            </ModernCard>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    backBtn: { padding: 8, marginLeft: -8 },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary },
    subtitle: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 },
    createToggle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: theme.spacing.lg },
    formCard: { padding: theme.spacing.lg, marginBottom: 24 },
    formHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: theme.colors.text.primary },
    input: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border, fontSize: 15, marginBottom: 12, color: theme.colors.text.primary },
    textArea: { height: 80, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    teamCard: { padding: 16, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    teamInfo: { flex: 1, marginLeft: 16 },
    teamName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary },
    teamDate: { fontSize: 12, color: theme.colors.text.muted, marginTop: 2 },
    cardActions: { marginLeft: 10 },
    deleteBtn: { padding: 8 },
    teamDescription: { fontSize: 14, color: theme.colors.text.secondary, marginTop: 12, lineHeight: 20 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
    manageText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary, marginRight: 4 },
    emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { fontSize: 18, color: theme.colors.text.muted, marginTop: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});



