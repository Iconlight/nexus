import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { THEME } from '../../../src/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '../../../src/components/ModernCard';
import EmployeeDetailModal from '../../../src/components/EmployeeDetailModal';

export default function MyDepartment() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [teamName, setTeamName] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    const loadDepartmentData = async () => {
        try {
            const { data: managerData, error: managerError } = await supabase
                .from('team_managers')
                .select('team_id, teams(name)')
                .eq('manager_id', user?.id)
                .single();

            if (managerError || !managerData) return;

            setTeamName((managerData.teams as any)?.name);

            const { data: employees, error: empError } = await supabase
                .from('profiles')
                .select('*')
                .eq('team_id', managerData.team_id);

            if (empError) throw empError;

            const today = new Date().toISOString().split('T')[0];
            const { data: attendance } = await supabase
                .from('attendance_logs')
                .select('employee_id, check_in_time, check_out_time')
                .eq('date', today)
                .in('employee_id', employees.map(e => e.id));

            const members = employees.map(emp => {
                const log = attendance?.find(a => a.employee_id === emp.id);
                return {
                    ...emp,
                    status: log ? (log.check_out_time ? 'Checked Out' : 'Present') : 'Absent',
                    check_in_time: log?.check_in_time,
                };
            });

            setTeamMembers(members);
        } catch (error) {
            console.error('Error loading department data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDepartmentData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadDepartmentData();
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={THEME.colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={THEME.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.pageHeader}>
                    <Text style={styles.deptName}>{teamName || 'My Department'}</Text>
                    <Text style={styles.deptSub}>{teamMembers.length} Active Members</Text>
                </View>

                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/my-department/calendar')}>
                        <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="calendar" size={20} color={THEME.colors.primary} />
                        </View>
                        <Text style={styles.actionTitle}>Calendar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/my-department/reports')}>
                        <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="document-text" size={20} color="#9C27B0" />
                        </View>
                        <Text style={styles.actionTitle}>Reports</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/approvals')}>
                        <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="checkmark-circle" size={20} color={THEME.colors.success} />
                        </View>
                        <Text style={styles.actionTitle}>Approvals</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Today's Presence</Text>
                    {teamMembers.map(member => (
                        <TouchableOpacity
                            key={member.id}
                            onPress={() => setSelectedEmployee(member)}
                        >
                            <ModernCard style={styles.memberCard}>
                                <View style={styles.memberMain}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{member.first_name[0]}{member.last_name[0]}</Text>
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{member.first_name} {member.last_name}</Text>
                                        <Text style={styles.memberRole}>{member.job_title || member.role.toUpperCase()}</Text>
                                    </View>
                                    <View style={[
                                        styles.statusBadge,
                                        member.status === 'Present' ? styles.statusPresent :
                                            member.status === 'Checked Out' ? styles.statusCheckedOut :
                                                styles.statusAbsent
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            member.status === 'Present' ? styles.statusTextPresent :
                                                member.status === 'Checked Out' ? styles.statusTextCheckedOut :
                                                    styles.statusTextAbsent
                                        ]}>{member.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                            </ModernCard>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <EmployeeDetailModal
                visible={!!selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
                employee={selectedEmployee}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: THEME.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { padding: 8, marginLeft: -8 },
    refreshBtn: { padding: 8, marginRight: -8 },
    scrollContent: { padding: THEME.spacing.lg },
    pageHeader: { marginBottom: 24 },
    deptName: { fontSize: 24, fontWeight: 'bold', color: THEME.colors.text.primary },
    deptSub: { fontSize: 14, color: THEME.colors.text.secondary, marginTop: 4 },
    actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    actionCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    actionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionTitle: { fontSize: 13, fontWeight: 'bold', color: THEME.colors.text.primary },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.colors.text.primary, marginBottom: 16 },
    memberCard: { padding: 12, marginBottom: 10 },
    memberMain: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: THEME.colors.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    memberInfo: { flex: 1, marginLeft: 12 },
    memberName: { fontSize: 15, fontWeight: 'bold', color: THEME.colors.text.primary },
    memberRole: { fontSize: 12, color: THEME.colors.text.muted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusPresent: { backgroundColor: THEME.colors.success + '15' },
    statusCheckedOut: { backgroundColor: THEME.colors.warning + '15' },
    statusAbsent: { backgroundColor: THEME.colors.error + '15' },
    statusText: { fontSize: 9, fontWeight: 'bold' },
    statusTextPresent: { color: THEME.colors.success },
    statusTextCheckedOut: { color: THEME.colors.warning },
    statusTextAbsent: { color: THEME.colors.error }
});
