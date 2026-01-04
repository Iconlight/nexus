import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../src/services/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';
import { ActivityCard } from '../../src/components/ActivityCard';
// import { ProgressRing } from '../../src/components/ProgressRing'; // Re-enable if needed, checking theme support
import UserListModal, { UserListItem } from '../../src/components/UserListModal';

type Profile = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    company_id: string;
    allowed_leave_days: number;
    company?: { name: string };
};

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Real data states
    const [checkInTime, setCheckInTime] = useState<string>('--:--');
    const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
    const [unreadMessages, setUnreadMessages] = useState<number>(0);
    const [remainingLeaves, setRemainingLeaves] = useState<number>(0);
    const [latestPayslip, setLatestPayslip] = useState<string>('N/A');
    const [daysPresent, setDaysPresent] = useState<number>(0);
    const [attendanceRate, setAttendanceRate] = useState<number>(100);
    const [onLeaveTodayCount, setOnLeaveTodayCount] = useState<number>(0);

    // User List Modal State
    const [listModalVisible, setListModalVisible] = useState(false);
    const [listTitle, setListTitle] = useState('');
    const [listUsers, setListUsers] = useState<UserListItem[]>([]);
    const [listLoading, setListLoading] = useState(false);

    // Helper to open modal
    const openUserList = async (type: 'present' | 'leaves') => {
        setListModalVisible(true);
        setListLoading(true);
        setListUsers([]);

        try {
            const today = new Date().toISOString().split('T')[0];
            let users: UserListItem[] = [];

            if (type === 'present') {
                setListTitle("Present Today");
                // Fetch who checked in today
                const { data: logs, error } = await supabase
                    .from('attendance_logs')
                    .select('check_in_time, employee:profiles!employee_id(id, first_name, last_name, email)')
                    .eq('date', today);

                if (error) throw error;

                users = logs.map((log: any) => ({
                    id: log.employee.id,
                    first_name: log.employee.first_name,
                    last_name: log.employee.last_name,
                    email: log.employee.email,
                    description: `Checked in at ${new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                }));

            } else if (type === 'leaves') {
                setListTitle("On Leave Today");
                // Fetch approved leaves overlapping today
                const { data: leaves, error } = await supabase
                    .from('leave_requests')
                    .select('start_date, end_date, leave_type, employee:profiles!employee_id(id, first_name, last_name, email)')
                    .eq('status', 'approved')
                    .lte('start_date', today)
                    .gte('end_date', today);

                if (error) throw error;

                users = leaves.map((l: any) => ({
                    id: l.employee.id,
                    first_name: l.employee.first_name,
                    last_name: l.employee.last_name,
                    email: l.employee.email,
                    description: `${l.leave_type} (${l.start_date} - ${l.end_date})`
                }));
            }

            setListUsers(users);
        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", "Failed to load details");
        } finally {
            setListLoading(false);
        }
    };


    const loadDashboardData = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            // 1. Load profile & basic stats
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*, company:companies(name)')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);
            setRemainingLeaves(profileData.allowed_leave_days || 0);

            // 2. Load stats: Total Days Present & Today's Check-in
            const today = new Date().toISOString().split('T')[0];

            // Check today's status
            const { data: todayLog } = await supabase
                .from('attendance_logs')
                .select('check_in_time')
                .eq('employee_id', user.id)
                .eq('date', today)
                .maybeSingle();

            if (todayLog?.check_in_time) {
                const time = new Date(todayLog.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setCheckInTime(time);
                setIsCheckedIn(true);
            } else {
                setCheckInTime('--:--');
                setIsCheckedIn(false);
            }

            // Get total days present (all time)
            const { count: totalDays } = await supabase
                .from('attendance_logs')
                .select('*', { count: 'exact', head: true })
                .eq('employee_id', user.id);

            setDaysPresent(totalDays || 0);

            // Calculate Attendance Rate (Current Month)
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const { count: monthPresence } = await supabase
                .from('attendance_logs')
                .select('*', { count: 'exact', head: true })
                .eq('employee_id', user.id)
                .gte('date', startOfMonth);

            // Calc working days passed in month (rough calc: excluding weekends)
            const now = new Date();
            let workingDays = 0;
            for (let d = new Date(new Date().getFullYear(), new Date().getMonth(), 1); d <= now; d.setDate(d.getDate() + 1)) {
                if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
            }
            if (workingDays === 0) workingDays = 1; // Avoid NaN
            setAttendanceRate(Math.min(100, Math.round(((monthPresence || 0) / workingDays) * 100)));

            // Calculate Remaining Leaves
            const { data: approvedLeaves } = await supabase
                .from('leave_requests')
                .select('start_date, end_date')
                .eq('employee_id', user.id)
                .eq('status', 'approved'); // Should filter by current year if needed

            let daysTaken = 0;
            approvedLeaves?.forEach(l => {
                const start = new Date(l.start_date);
                const end = new Date(l.end_date);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                daysTaken += diffDays;
            });
            setRemainingLeaves(Math.max(0, (profileData.allowed_leave_days || 0) - daysTaken));

            // Fetch "On Leave Today" (Company-wide)
            const { count: onLeaveCount } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved')
                .lte('start_date', today)
                .gte('end_date', today)
                .eq('company_id', profileData.company_id);
            setOnLeaveTodayCount(onLeaveCount || 0);

            // 3. Load unread messages
            const { count: unreadCount } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false)
                .neq('sender_id', user.id);
            setUnreadMessages(unreadCount || 0);

            // 4. Load latest published payslip
            const { data: payslip } = await supabase
                .from('payroll_records')
                .select('month')
                .eq('employee_id', user.id)
                .eq('status', 'published')
                .order('month', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (payslip?.month) {
                const monthName = new Date(payslip.month).toLocaleDateString('default', { month: 'short' });
                setLatestPayslip(monthName);
            }

        } catch (err: any) {
            console.error('Error loading dashboard data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboardData();
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading Nexus...</Text>
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View style={styles.centerContainer}>
                <ModernCard style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                    <Text style={styles.errorTitle}>Error Loading Dashboard</Text>
                    <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadDashboardData}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </ModernCard>
            </View>
        );
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'ceo';
    const isManager = profile.role === 'manager';
    const isHR = profile.role === 'hr';
    const isFinance = profile.role === 'finance';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{profile.company?.name || 'Nexus'}</Text>
                        <Text style={styles.nameLabel}>{profile.first_name} {profile.last_name}</Text>
                        <Text style={styles.roleLabel}>{profile.role.toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileIndicator}
                        onPress={() => router.push('/(app)/profile')}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{profile.first_name[0]}{profile.last_name[0]}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Main Goal Ring */}
                <ModernCard style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <Text style={styles.goalTitle}>Work Summary</Text>
                        <TouchableOpacity onPress={signOut}>
                            <Ionicons name="log-out-outline" size={20} color={theme.colors.text.secondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summaryContainer}>
                        <TouchableOpacity onPress={() => openUserList('present')} style={styles.summaryItem}>
                            <View style={[styles.summaryIcon, { backgroundColor: isCheckedIn ? theme.colors.primary + '15' : theme.colors.error + '10' }]}>
                                <Ionicons name="time" size={24} color={isCheckedIn ? theme.colors.primary : theme.colors.error} />
                            </View>
                            <View>
                                <Text style={[styles.summaryValue, !isCheckedIn && { color: theme.colors.error, fontSize: 13, fontWeight: '600' }]}>
                                    {isCheckedIn ? checkInTime : 'NOT SIGNED IN'}
                                </Text>
                                <Text style={styles.summaryLabel}>Today's In</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.summaryItem}>
                            <View style={[styles.summaryIcon, { backgroundColor: theme.colors.success + '15' }]}>
                                <Ionicons name="calendar" size={24} color={theme.colors.success} />
                            </View>
                            <View>
                                <Text style={styles.summaryValue}>{daysPresent}</Text>
                                <Text style={styles.summaryLabel}>Days Present</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.goalStats}>
                        <View style={styles.goalStatItem}>
                            <Text style={styles.goalStatLabel}>Attendance</Text>
                            <Text style={styles.goalStatValue}>{attendanceRate}%</Text>
                        </View>
                        <View style={styles.goalStatDivider} />
                        <View style={styles.goalStatItem}>
                            <Text style={styles.goalStatLabel}>Leaves</Text>
                            <Text style={styles.goalStatValue}>{remainingLeaves} Days</Text>
                        </View>
                    </View>
                </ModernCard>

                {/* Activity Grid */}
                <Text style={styles.sectionTitle}>Quick Access</Text>
                <View style={styles.activityGrid}>
                    <ActivityCard
                        title="Check In"
                        value={checkInTime}
                        unit="Today"
                        icon="location"
                        color={theme.colors.primary}
                        onPress={() => router.push('/(app)/check-in')}
                    />
                    <ActivityCard
                        title="Messages"
                        value={unreadMessages.toString()}
                        unit="New"
                        icon="chatbubbles"
                        color={theme.colors.info}
                        alert={unreadMessages > 0}
                        onPress={() => router.push('/(app)/chat')}
                    />
                    <ActivityCard
                        title="Leaves"
                        value={remainingLeaves.toString()}
                        unit="Days Left"
                        icon="calendar"
                        color={theme.colors.warning}
                        onPress={() => router.push('/(app)/leave')}
                    />
                    <ActivityCard
                        title="Payslips"
                        value={latestPayslip}
                        unit="Latest"
                        icon="cash"
                        color={theme.colors.success}
                        onPress={() => router.push('/(app)/payslips')}
                    />
                    <ActivityCard
                        title="Presence"
                        value="View"
                        unit="List"
                        icon="people"
                        color={theme.colors.secondary}
                        onPress={() => openUserList('present')}
                    />
                    <ActivityCard
                        title="On Leave"
                        value={onLeaveTodayCount.toString()}
                        unit="Today"
                        icon="calendar-outline"
                        color={theme.colors.error}
                        onPress={() => openUserList('leaves')}
                    />
                </View>

                {/* Management Section */}
                {(isAdmin || isManager || isHR) && (
                    <>
                        <Text style={styles.sectionTitle}>Management</Text>
                        <View style={styles.actionGrid}>
                            {(isAdmin || isHR) && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/employees')}>
                                    <View style={[styles.actionIconBox, { backgroundColor: '#E3F2FD' }]}>
                                        <Ionicons name="people" size={24} color="#2196F3" />
                                    </View>
                                    <Text style={styles.actionBtnText}>Employees</Text>
                                </TouchableOpacity>
                            )}

                            {/* Manager: My Department */}
                            {isManager && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/my-department')}>
                                    <View style={[styles.actionIconBox, { backgroundColor: '#E3F2FD' }]}>
                                        <Ionicons name="business" size={24} color={THEME.colors.primary} />
                                    </View>
                                    <Text style={styles.actionBtnText}>My Dept</Text>
                                </TouchableOpacity>
                            )}

                            {(isAdmin || isHR) && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/teams')}>
                                    <View style={[styles.actionIconBox, { backgroundColor: '#F3E5F5' }]}>
                                        <Ionicons name="business" size={24} color="#9C27B0" />
                                    </View>
                                    <Text style={styles.actionBtnText}>Teams</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/approvals')}>
                                <View style={[styles.actionIconBox, { backgroundColor: '#E8F5E9' }]}>
                                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                </View>
                                <Text style={styles.actionBtnText}>Approvals</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/attendance-report')}>
                                <View style={[styles.actionIconBox, { backgroundColor: isDark ? '#333' : '#FFFDE7' }]}>
                                    <Ionicons name="stats-chart" size={24} color="#FBC02D" />
                                </View>
                                <Text style={styles.actionBtnText}>Attendance</Text>
                            </TouchableOpacity>

                            {(isAdmin || isHR) && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(app)/settings')}>
                                    <View style={[styles.actionIconBox, { backgroundColor: '#FFF3E0' }]}>
                                        <Ionicons name="settings" size={24} color="#FF9800" />
                                    </View>
                                    <Text style={styles.actionBtnText}>Settings</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}

                {/* Finance Section */}
                {(isAdmin || isFinance) && (
                    <ModernCard style={styles.financeCard}>
                        <View style={styles.financeHeader}>
                            <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
                            <Text style={styles.financeTitle}>Payroll Management</Text>
                        </View>
                        <TouchableOpacity style={styles.financeBtn} onPress={() => router.push('/(app)/payroll')}>
                            <Text style={styles.financeBtnText}>Manage Payroll</Text>
                            <Ionicons name="arrow-forward" size={18} color="white" />
                        </TouchableOpacity>
                    </ModernCard>
                )}

                <UserListModal
                    visible={listModalVisible}
                    onClose={() => setListModalVisible(false)}
                    title={listTitle}
                    users={listUsers}
                    loading={listLoading}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    contentContainer: { padding: theme.spacing.lg },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    loadingText: { marginTop: 16, fontSize: 16, color: theme.colors.text.secondary, fontWeight: '500' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xl },
    greeting: { fontSize: 16, color: theme.colors.text.secondary, fontWeight: '500' },
    nameLabel: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary, marginTop: 4 },
    profileIndicator: { width: 48, height: 48, borderRadius: 24, padding: 2, borderWidth: 2, borderColor: theme.colors.primary },
    avatar: { flex: 1, backgroundColor: theme.colors.primary, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: theme.spacing.md, marginTop: theme.spacing.sm },

    // Updated ActivityGrid to center items
    activityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },

    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: theme.spacing.xl },
    actionBtn: { alignItems: 'center', width: '28%' },
    actionIconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionBtnText: { fontSize: 11, fontWeight: '600', color: theme.colors.text.secondary, textAlign: 'center' },
    financeCard: { padding: theme.spacing.lg, marginBottom: theme.spacing.xl, backgroundColor: theme.colors.card, borderColor: theme.colors.primary + '10', borderWidth: 1 },
    financeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg },
    financeTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text.primary, marginLeft: 12 },
    financeBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    financeBtnText: { color: 'white', fontWeight: 'bold', marginRight: 8, fontSize: 16 },
    errorCard: { padding: theme.spacing.xl, alignItems: 'center' },
    errorTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.primary, marginTop: 16 },
    errorText: { fontSize: 14, color: theme.colors.text.secondary, textAlign: 'center', marginVertical: 16 },
    retryBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { color: 'white', fontWeight: 'bold' },
    goalCard: { padding: theme.spacing.lg, marginBottom: theme.spacing.xl },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
    goalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text.primary },
    summaryContainer: { gap: 16, marginVertical: 8 },
    summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: theme.colors.background, padding: 12, borderRadius: 16 },
    summaryIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    summaryValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary },
    summaryLabel: { fontSize: 12, color: theme.colors.text.muted },
    goalStats: { flexDirection: 'row', alignItems: 'center', marginTop: 24, width: '100%', paddingHorizontal: 4 },
    goalStatItem: { flex: 1, alignItems: 'center' },
    goalStatLabel: { fontSize: 12, color: theme.colors.text.muted, marginBottom: 4 },
    goalStatValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
    goalStatDivider: { width: 1, height: 30, backgroundColor: theme.colors.border },
    roleLabel: { fontSize: 12, color: theme.colors.primary, fontWeight: 'bold', marginTop: 4, letterSpacing: 0.5 }
});
