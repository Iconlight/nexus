import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';
import EmployeeDetailModal from '../../src/components/EmployeeDetailModal';

type AttendanceRecord = {
    id: string;
    employee_id: string;
    check_in_time: string;
    check_out_time: string | null;
    status: string;
    employee: {
        id: string;
        first_name: string;
        last_name: string;
        job_title: string;
        email: string;
        role: string;
        department?: { name: string };
    };
};

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    job_title: string;
    email: string;
    role: string;
};

export default function AttendanceReport() {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const router = useRouter();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data
    const [checkedIn, setCheckedIn] = useState<AttendanceRecord[]>([]);
    const [absent, setAbsent] = useState<Employee[]>([]);
    const [completed, setCompleted] = useState<AttendanceRecord[]>([]);

    // Stats
    const [presentCount, setPresentCount] = useState(0);
    const [absentCount, setAbsentCount] = useState(0);
    const [totalEmployees, setTotalEmployees] = useState(0);

    // Search & UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<'working' | 'absent'>('working');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];

            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
            if (!profile?.company_id) return;

            // Fetch all active employees
            const { data: allEmployees } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', profile.company_id)
                .eq('is_active', true)
                .neq('role', 'admin')
                .neq('role', 'ceo');

            // Fetch today's logs
            const { data: logs } = await supabase
                .from('attendance_logs')
                .select(`*, employee:profiles(id, first_name, last_name, job_title, email, role, department:teams(name))`)
                .eq('company_id', profile.company_id)
                .eq('date', today);

            const checkedInList: AttendanceRecord[] = [];
            const completedList: AttendanceRecord[] = [];
            const presentIds = new Set<string>();

            logs?.forEach((log: any) => {
                presentIds.add(log.employee_id);
                if (log.check_out_time) {
                    completedList.push(log);
                } else {
                    checkedInList.push(log);
                }
            });

            const absentList = allEmployees?.filter(emp => !presentIds.has(emp.id)) || [];

            setCheckedIn(checkedInList);
            setCompleted(completedList);
            setAbsent(absentList);

            setTotalEmployees(allEmployees?.length || 0);
            setPresentCount(presentIds.size);
            setAbsentCount(absentList.length);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleEmployeePress = (employee: any) => {
        setSelectedEmployee({
            ...employee,
            id: employee.id || employee.employee_id
        });
        setModalVisible(true);
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Filter Logic
    const filteredWorking = checkedIn.filter(r =>
        (r.employee.first_name + ' ' + r.employee.last_name).toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredAbsent = absent.filter(e =>
        (e.first_name + ' ' + e.last_name).toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Attendance Report</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.colors.success }]}>{presentCount}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.colors.error }]}>{absentCount}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.colors.info }]}>{totalEmployees}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={theme.colors.text.muted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search employees..."
                    placeholderTextColor={theme.colors.text.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'working' && styles.activeTab]}
                    onPress={() => setActiveTab('working')}
                >
                    <Text style={[styles.tabText, activeTab === 'working' && styles.activeTabText]}>Currently Working</Text>
                    {activeTab === 'working' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'absent' && styles.activeTab]}
                    onPress={() => setActiveTab('absent')}
                >
                    <Text style={[styles.tabText, activeTab === 'absent' && styles.activeTabText]}>Absent Today</Text>
                    {activeTab === 'absent' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
            </View>

            {/* List Content */}
            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {activeTab === 'working' ? (
                    filteredWorking.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="briefcase-outline" size={48} color={theme.colors.text.muted} />
                            <Text style={styles.emptyText}>No one is currently clocked in.</Text>
                        </View>
                    ) : (
                        filteredWorking.map(record => (
                            <TouchableOpacity key={record.id} onPress={() => handleEmployeePress({ ...record.employee, id: record.employee_id })}>
                                <ModernCard style={styles.card}>
                                    <View style={styles.cardRow}>
                                        <View style={styles.userInfo}>
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>{record.employee.first_name[0]}</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.userName}>{record.employee.first_name} {record.employee.last_name}</Text>
                                                <Text style={styles.userRole}>{record.employee.job_title}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: theme.colors.success + '15' }]}>
                                            <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
                                            <Text style={[styles.badgeText, { color: theme.colors.success }]}>
                                                {formatTime(record.check_in_time)}
                                            </Text>
                                        </View>
                                    </View>
                                </ModernCard>
                            </TouchableOpacity>
                        ))
                    )
                ) : (
                    filteredAbsent.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.success} />
                            <Text style={styles.emptyText}>Everyone is present today!</Text>
                        </View>
                    ) : (
                        filteredAbsent.map(emp => (
                            <TouchableOpacity key={emp.id} onPress={() => handleEmployeePress(emp)}>
                                <ModernCard style={styles.card}>
                                    <View style={styles.cardRow}>
                                        <View style={styles.userInfo}>
                                            <View style={[styles.avatar, { backgroundColor: theme.colors.error + '15' }]}>
                                                <Text style={[styles.avatarText, { color: theme.colors.error }]}>{emp.first_name[0]}</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.userName}>{emp.first_name} {emp.last_name}</Text>
                                                <Text style={styles.userRole}>{emp.job_title}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: theme.colors.error + '15' }]}>
                                            <Text style={[styles.badgeText, { color: theme.colors.error }]}>ABSENT</Text>
                                        </View>
                                    </View>
                                </ModernCard>
                            </TouchableOpacity>
                        ))
                    )
                )}
            </ScrollView>

            <EmployeeDetailModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                employee={selectedEmployee}
            />
        </SafeAreaView>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.card,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: theme.colors.background },
    refreshBtn: { padding: 8, borderRadius: 12, backgroundColor: theme.colors.primary + '10' },
    title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary },

    statsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card, // Removed hardcoded white
        margin: theme.spacing.lg,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'space-between',
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    statLabel: { fontSize: 11, color: theme.colors.text.muted, textTransform: 'uppercase', fontWeight: '600' },
    statDivider: { width: 1, height: '80%', backgroundColor: theme.colors.border },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card, // Fixed hardcoded white
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        height: 48,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: theme.colors.text.primary, fontSize: 16 },

    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.card,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        position: 'relative',
    },
    activeTab: {},
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.secondary,
    },
    activeTabText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        width: '100%',
        backgroundColor: theme.colors.primary,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },

    listContent: { padding: theme.spacing.lg },
    emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { color: theme.colors.text.muted, fontSize: 16, fontStyle: 'italic' },

    card: { padding: 16, marginBottom: 12 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
    userName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
    userRole: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 },

    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    badgeText: { fontSize: 12, fontWeight: '600' },
    dot: { width: 8, height: 8, borderRadius: 4 },
});
