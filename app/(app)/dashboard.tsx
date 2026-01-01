import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../src/services/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';
import { ActivityCard } from '../../src/components/ActivityCard';
import { ProgressRing } from '../../src/components/ProgressRing';

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

            // 2. Load today's attendance & month stats
            const today = new Date().toISOString().split('T')[0];
            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

            const { data: attendanceLogs } = await supabase
                .from('attendance_logs')
                .select('check_in_time, date')
                .eq('employee_id', user.id)
                .gte('date', firstDayOfMonth);

            const todayLog = attendanceLogs?.find(l => l.date === today);
            if (todayLog?.check_in_time) {
                const time = new Date(todayLog.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setCheckInTime(time);
                setIsCheckedIn(true);
            } else {
                setCheckInTime('--:--');
                setIsCheckedIn(false);
            }

            const monthDays = attendanceLogs?.length || 0;
            setDaysPresent(monthDays);

            // Calculate attendance rate (mocking total working days for now as ~22 per month)
            const rate = Math.min(100, Math.round((monthDays / 22) * 100));
            setAttendanceRate(rate);

            // 3. Load unread messages (simulated as active channels for now)
            const { count } = await supabase
                .from('chat_channels')
                .select('*', { count: 'exact', head: true });
            setUnreadMessages(count || 0);

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
                <ActivityIndicator size="large" color={THEME.colors.primary} />
                <Text style={styles.loadingText}>Loading Nexus...</Text>
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View style={styles.centerContainer}>
                <ModernCard style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={48} color={THEME.colors.error} />
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
        <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
            <StatusBar barStyle="dark-content" />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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
                            <Ionicons name="log-out-outline" size={20} color={THEME.colors.text.secondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryItem}>
                            <View style={[styles.summaryIcon, { backgroundColor: isCheckedIn ? THEME.colors.primary + '15' : THEME.colors.error + '10' }]}>
                                <Ionicons name="time" size={24} color={isCheckedIn ? THEME.colors.primary : THEME.colors.error} />
                            </View>
                            <View>
                                <Text style={[styles.summaryValue, !isCheckedIn && { color: THEME.colors.error, fontSize: 13 }]}>
                                    {isCheckedIn ? checkInTime : 'NOT SIGNED IN'}
                                </Text>
                                <Text style={styles.summaryLabel}>Today's In</Text>
                            </View>
                        </View>
                        <View style={styles.summaryItem}>
                            <View style={[styles.summaryIcon, { backgroundColor: THEME.colors.success + '15' }]}>
                                <Ionicons name="calendar-check" size={24} color={THEME.colors.success} />
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
                        color={THEME.colors.primary}
                        onPress={() => router.push('/(app)/check-in')}
                    />
                    <ActivityCard
                        title="Messages"
                        value={unreadMessages.toString()}
                        unit="New"
                        icon="chatbubbles"
                        color={THEME.colors.info}
                        onPress={() => router.push('/(app)/chat')}
                    />
                    <ActivityCard
                        title="Leaves"
                        value={remainingLeaves.toString()}
                        unit="Days Left"
                        icon="calendar"
                        color={THEME.colors.warning}
                        onPress={() => router.push('/(app)/leave')}
                    />
                    <ActivityCard
                        title="Payslips"
                        value={latestPayslip}
                        unit="Latest"
                        icon="cash"
                        color={THEME.colors.success}
                        onPress={() => router.push('/(app)/payslips')}
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
                                <View style={[styles.actionIconBox, { backgroundColor: '#FFFDE7' }]}>
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
                            <Ionicons name="wallet-outline" size={24} color={THEME.colors.primary} />
                            <Text style={styles.financeTitle}>Payroll Management</Text>
                        </View>
                        <TouchableOpacity style={styles.financeBtn} onPress={() => router.push('/(app)/payroll')}>
                            <Text style={styles.financeBtnText}>Manage Payroll</Text>
                            <Ionicons name="arrow-forward" size={18} color="white" />
                        </TouchableOpacity>
                    </ModernCard>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    contentContainer: { padding: THEME.spacing.lg },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.background },
    loadingText: { marginTop: 16, fontSize: 16, color: THEME.colors.text.secondary, fontWeight: '500' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: THEME.spacing.xl },
    greeting: { fontSize: 16, color: THEME.colors.text.secondary, fontWeight: '500' },
    nameLabel: { fontSize: 24, fontWeight: 'bold', color: THEME.colors.text.primary, marginTop: 4 },
    profileIndicator: { width: 48, height: 48, borderRadius: 24, padding: 2, borderWidth: 2, borderColor: THEME.colors.primary },
    avatar: { flex: 1, backgroundColor: THEME.colors.primary, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.colors.text.primary, marginBottom: THEME.spacing.md, marginTop: THEME.spacing.sm },
    activityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: THEME.spacing.xl },
    actionBtn: { alignItems: 'center', width: '22%' },
    actionIconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionBtnText: { fontSize: 11, fontWeight: '600', color: THEME.colors.text.secondary },
    financeCard: { padding: THEME.spacing.lg, marginBottom: THEME.spacing.xl, backgroundColor: '#F8F7FF', borderColor: THEME.colors.primary + '10', borderWidth: 1 },
    financeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: THEME.spacing.lg },
    financeTitle: { fontSize: 16, fontWeight: '700', color: THEME.colors.text.primary, marginLeft: 12 },
    financeBtn: { backgroundColor: THEME.colors.primary, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    financeBtnText: { color: 'white', fontWeight: 'bold', marginRight: 8, fontSize: 16 },
    errorCard: { padding: THEME.spacing.xl, alignItems: 'center' },
    errorTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.colors.text.primary, marginTop: 16 },
    errorText: { fontSize: 14, color: THEME.colors.text.secondary, textAlign: 'center', marginVertical: 16 },
    retryBtn: { backgroundColor: THEME.colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { color: 'white', fontWeight: 'bold' },
    goalCard: { padding: THEME.spacing.lg, marginBottom: THEME.spacing.xl },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
    goalTitle: { fontSize: 18, fontWeight: '700', color: THEME.colors.text.primary },
    summaryContainer: { gap: 16, marginVertical: 8 },
    summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 16 },
    summaryIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    summaryValue: { fontSize: 18, fontWeight: 'bold', color: THEME.colors.text.primary },
    summaryLabel: { fontSize: 12, color: THEME.colors.text.muted },
    goalStats: { flexDirection: 'row', alignItems: 'center', marginTop: 24, width: '100%', paddingHorizontal: 4 },
    goalStatItem: { flex: 1, alignItems: 'center' },
    goalStatLabel: { fontSize: 12, color: THEME.colors.text.muted, marginBottom: 4 },
    goalStatValue: { fontSize: 16, fontWeight: 'bold', color: THEME.colors.text.primary },
    goalStatDivider: { width: 1, height: 30, backgroundColor: '#eee' },
    roleLabel: { fontSize: 12, color: THEME.colors.primary, fontWeight: 'bold', marginTop: 4, letterSpacing: 0.5 }
});
