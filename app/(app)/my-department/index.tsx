import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import DepartmentCalendar from '../../../src/components/DepartmentCalendar';
import DepartmentReports from '../../../src/components/DepartmentReports';
import ManageLeadersModal from '../../../src/components/ManageLeadersModal';
import EmployeeDetailModal from '../../../src/components/EmployeeDetailModal';
import AddMemberModal from '../../../src/components/AddMemberModal';
import LeaveRequestModal from '../../../src/components/LeaveRequestModal';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/context/ThemeContext';
import { THEME } from '../../../src/constants/Theme';
import { ModernCard } from '../../../src/components/ModernCard';

export default function MyDepartment() {
    const { user } = useAuth();
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [teamId, setTeamId] = useState<string | null>(null);
    const [team, setTeam] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'reports' | 'requests'>('overview');
    const [loading, setLoading] = useState(true);

    const [showLeadersModal, setShowLeadersModal] = useState(false);
    const [eligibleManagers, setEligibleManagers] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<any>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    useEffect(() => {
        loadMyDepartment();
    }, []);

    async function loadMyDepartment() {
        setLoading(true);
        try {
            // 1. Find my team
            let myTeamId = null;

            // Check if manager
            const { data: managerData } = await supabase.from('team_managers').select('team_id').eq('manager_id', user?.id).maybeSingle();

            if (managerData) {
                myTeamId = managerData.team_id;
            } else {
                // If not manager, check profile? But this page is for managers usually.
                // If user is just styled as manager but not in manager table, use profile team_id
                const { data: profile } = await supabase.from('profiles').select('team_id').eq('id', user?.id).single();
                myTeamId = profile?.team_id;
            }

            if (!myTeamId) {
                setLoading(false);
                return; // Or show error
            }

            setTeamId(myTeamId);
            await loadTeamData(myTeamId);

        } catch (error) {
            console.error('Error finding department:', error);
            setLoading(false);
        }
    }

    async function loadTeamData(idToLoad: string) {
        try {
            const { data: teamData, error: teamError } = await supabase.from('teams').select('*').eq('id', idToLoad).single();
            if (teamError) throw teamError;
            setTeam(teamData);

            const { data: membersData, error: membersError } = await supabase.from('profiles').select('*').eq('team_id', idToLoad);
            if (membersError) throw membersError;

            const today = new Date().toISOString().split('T')[0];
            const { data: attendance } = await supabase.from('attendance_logs').select('employee_id, check_in_time, check_out_time').eq('date', today).in('employee_id', membersData?.map(m => m.id) || []);

            const enrichedMembers = membersData?.map(m => {
                const log = attendance?.find(a => a.employee_id === m.id);
                return { ...m, status: log ? (log.check_out_time ? 'Checked Out' : 'Present') : 'Absent' };
            }) || [];
            setMembers(enrichedMembers);

            const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user?.id).single();
            if (profile) {
                setCurrentUserRole(profile.role);
                const { data: allStaff } = await supabase.from('profiles').select('id, first_name, last_name, email, role').eq('company_id', profile.company_id).in('role', ['employee', 'manager']);
                setEligibleManagers(allStaff || []);
            }

            const { data: requests } = await supabase
                .from('leave_requests')
                .select('id, start_date, end_date, type, status, reason, attachment_url, reviewer_note, profiles:employee_id (first_name, last_name)')
                .eq('status', 'pending')
                .in('employee_id', membersData?.map(m => m.id) || [])
                .order('start_date');
            setLeaveRequests(requests || []);

        } catch (error) {
            console.error('Error loading team:', error);
        } finally {
            setLoading(false);
        }
    }

    async function removeMember(memberId: string) {
        const confirmMsg = "Remove this member from the department?";
        const confirmed = Platform.OS === 'web' ? window.confirm(confirmMsg) : await new Promise(r => Alert.alert('Confirm', confirmMsg, [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: () => r(true) }]));
        if (confirmed) performRemove(memberId);
    }

    async function performRemove(memberId: string) {
        try {
            const { error } = await supabase.from('profiles').update({ team_id: null }).eq('id', memberId);
            if (error) throw error;
            if (teamId) loadTeamData(teamId);
        } catch (error: any) { Alert.alert('Error', error.message); }
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!teamId) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.title}>My Department</Text>
                    </View>
                </View>
                <View style={styles.center}>
                    <Ionicons name="people-outline" size={64} color={theme.colors.text.secondary} />
                    <Text style={styles.emptyText}>You are not assigned to a department.</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!team) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.center}>
                    <Text style={{ color: theme.colors.text.secondary }}>Department not found or assigned.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.title}>{team?.name}</Text>
                        <Text style={styles.subtitle} numberOfLines={1}>{team?.description || 'Department Overview'}</Text>
                    </View>
                </View>

                <View style={styles.headerActions}>
                    {['manager', 'admin', 'ceo'].includes(currentUserRole) && (
                        <TouchableOpacity style={[styles.actionBtn, { marginLeft: 8 }]} onPress={() => setShowAddMemberModal(true)}>
                            <Ionicons name="person-add-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.actionBtnText}>Add Member</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                    {[
                        { id: 'overview', label: 'Overview', icon: 'grid-outline' },
                        { id: 'calendar', label: 'Calendar', icon: 'calendar-outline' },
                        { id: 'reports', label: 'Reports', icon: 'document-text-outline' },
                        { id: 'requests', label: 'Requests', icon: 'time-outline', badge: leaveRequests.length > 0 }
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                            onPress={() => setActiveTab(tab.id as any)}
                        >
                            <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? theme.colors.primary : theme.colors.text.secondary} />
                            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
                            {tab.badge && <View style={styles.badgePoint} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.content}>
                {activeTab === 'overview' && (
                    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={styles.statsRow}>
                            <ModernCard style={styles.statMiniCard}>
                                <Text style={styles.statValue}>{members.length}</Text>
                                <Text style={styles.statLabel}>Team Size</Text>
                            </ModernCard>
                            <ModernCard style={styles.statMiniCard}>
                                <Text style={[styles.statValue, { color: theme.colors.success }]}>{members.filter(m => m.status === 'Present').length}</Text>
                                <Text style={styles.statLabel}>Present</Text>
                            </ModernCard>
                        </View>

                        <Text style={styles.sectionTitle}>Team Roster</Text>
                        {members.map(member => (
                            <TouchableOpacity key={member.id} activeOpacity={0.9} onPress={() => setSelectedEmployee(member)}>
                                <ModernCard style={styles.memberCard}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{member.first_name[0]}{member.last_name[0]}</Text>
                                        <View style={[styles.statusDot, { backgroundColor: member.status === 'Present' ? theme.colors.success : member.status === 'Checked Out' ? theme.colors.warning : theme.colors.error }]} />
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{member.first_name} {member.last_name}</Text>
                                        <Text style={styles.memberRole}>{member.job_title || 'Employee'} • {member.role}</Text>
                                    </View>
                                    <View style={styles.memberRight}>
                                        {['manager', 'admin', 'ceo'].includes(currentUserRole) && (
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); removeMember(member.id); }} style={styles.removeBtn}>
                                                <Ionicons name="remove-circle-outline" size={22} color={theme.colors.error} />
                                            </TouchableOpacity>
                                        )}
                                        <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
                                    </View>
                                </ModernCard>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {activeTab === 'calendar' && <DepartmentCalendar teamId={teamId} />}
                {activeTab === 'reports' && <DepartmentReports teamId={teamId} />}
                {activeTab === 'requests' && (
                    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 40 }}>
                        <Text style={styles.sectionTitle}>Pending Leave Requests</Text>
                        {leaveRequests.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.success} />
                                <Text style={styles.emptyText}>All caught up!</Text>
                            </View>
                        ) : (
                            leaveRequests.map(req => (
                                <TouchableOpacity key={req.id} activeOpacity={0.9} onPress={() => setSelectedLeaveRequest(req)}>
                                    <ModernCard style={styles.requestCard}>
                                        <View style={styles.reqHeader}>
                                            <Text style={styles.reqName}>{req.profiles.first_name} {req.profiles.last_name}</Text>
                                            <View style={styles.reqBadge}><Text style={styles.reqBadgeText}>{req.type}</Text></View>
                                        </View>
                                        <Text style={styles.reqDates}>{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</Text>
                                        <Text style={styles.reqReason} numberOfLines={2}>{req.reason || 'No reason provided'}</Text>
                                        <View style={styles.reqFooter}>
                                            <Text style={styles.reqActionHint}>View Request</Text>
                                            {req.attachment_url && <Ionicons name="attach" size={16} color={theme.colors.text.muted} />}
                                        </View>
                                    </ModernCard>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>

            <ManageLeadersModal visible={showLeadersModal} onClose={() => setShowLeadersModal(false)} teamId={teamId || ""} teamName={team?.name} eligibleManagers={eligibleManagers} onUpdate={() => teamId && loadTeamData(teamId)} />
            <EmployeeDetailModal visible={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} employee={selectedEmployee} />
            <AddMemberModal visible={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} teamId={teamId || ""} onUpdate={() => teamId && loadTeamData(teamId)} />
            <LeaveRequestModal visible={!!selectedLeaveRequest} request={selectedLeaveRequest} onClose={() => setSelectedLeaveRequest(null)} onUpdate={() => teamId && loadTeamData(teamId)} />
        </SafeAreaView>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { padding: theme.spacing.lg, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 12 },
    headerTitleContainer: { flex: 1 },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary },
    subtitle: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 },
    headerActions: { flexDirection: 'row', marginTop: 16 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary + '15', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    actionBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 13, marginLeft: 8 },
    tabsContainer: { backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    tabsScroll: { paddingHorizontal: theme.spacing.lg },
    tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginRight: 24, borderBottomWidth: 3, borderBottomColor: 'transparent', gap: 8 },
    activeTab: { borderBottomColor: theme.colors.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: theme.colors.text.secondary },
    activeTabText: { color: theme.colors.primary },
    badgePoint: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.error, position: 'absolute', top: 14, right: -4 },
    content: { flex: 1 },
    page: { flex: 1, padding: theme.spacing.lg },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statMiniCard: { flex: 1, padding: 16, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text.primary },
    statLabel: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: theme.colors.text.primary },
    memberCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    avatarText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text.secondary },
    statusDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.card, position: 'absolute', bottom: 0, right: 0 },
    memberInfo: { flex: 1, marginLeft: 16 },
    memberName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
    memberRole: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 },
    memberRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    removeBtn: { padding: 4 },
    requestCard: { padding: 16, marginBottom: 12 },
    reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reqName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
    reqBadge: { backgroundColor: theme.colors.warning + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    reqBadgeText: { fontSize: 10, color: theme.colors.warning, fontWeight: 'bold' },
    reqDates: { fontSize: 13, color: theme.colors.primary, marginTop: 4, fontWeight: '500' },
    reqReason: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 8, lineHeight: 18 },
    reqFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
    reqActionHint: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 16, color: theme.colors.text.secondary, marginTop: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
