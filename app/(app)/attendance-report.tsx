import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform, Alert, TextInput, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import EmployeeDetailModal from '../../src/components/EmployeeDetailModal';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';

type AttendanceRecord = {
    id: string;
    employee_id: string;
    check_in_time: string;
    check_out_time: string | null;
    status: string;
    employee: {
        first_name: string;
        last_name: string;
        job_title: string;
        email: string;
        role: string;
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
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data lists
    const [checkedIn, setCheckedIn] = useState<AttendanceRecord[]>([]);
    const [absent, setAbsent] = useState<Employee[]>([]);
    const [completed, setCompleted] = useState<AttendanceRecord[]>([]);

    // Stats
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [presentCount, setPresentCount] = useState(0);
    const [absentCount, setAbsentCount] = useState(0);

    // Search & Modal
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        loadAttendanceData();
    }, []);

    async function loadAttendanceData() {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];

            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id, role')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            const { data: allEmployees, error: empError } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', profile.company_id)
                .eq('is_active', true)
                .neq('role', 'admin')
                .neq('role', 'ceo');

            if (empError) throw empError;

            const { data: logs, error: logsError } = await supabase
                .from('attendance_logs')
                .select(`
                    *,
                    employee:profiles (
                        first_name,
                        last_name,
                        job_title,
                        email,
                        role,
                        gender,
                        base_salary,
                        department:teams(name)
                    )
                `)
                .eq('company_id', profile.company_id)
                .eq('date', today);

            if (logsError) throw logsError;

            const checkedInList: AttendanceRecord[] = [];
            const completedList: AttendanceRecord[] = [];
            const presentEmployeeIds = new Set<string>();

            logs?.forEach((log: any) => {
                presentEmployeeIds.add(log.employee_id);
                if (log.check_out_time) {
                    completedList.push(log);
                } else {
                    checkedInList.push(log);
                }
            });

            const absentList = allEmployees?.filter(emp => !presentEmployeeIds.has(emp.id)) || [];

            setCheckedIn(checkedInList);
            setCompleted(completedList);
            setAbsent(absentList);

            setTotalEmployees(allEmployees?.length || 0);
            setPresentCount(presentEmployeeIds.size);
            setAbsentCount(absentList.length);

        } catch (error: any) {
            console.error('Error loading attendance:', error);
            Alert.alert('Error', error.message || 'Failed to load attendance data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = () => {
        setRefreshing(true);
        loadAttendanceData();
    };

    const filteredCheckedIn = checkedIn.filter(r =>
        (r.employee.first_name + ' ' + r.employee.last_name).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAbsent = absent.filter(e =>
        (e.first_name + ' ' + e.last_name).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCompleted = completed.filter(r =>
        (r.employee.first_name + ' ' + r.employee.last_name).toLowerCase().includes(searchQuery.toLowerCase())
    );

    function handleEmployeePress(employee: any) {
        setSelectedEmployee({
            ...employee,
            id: employee.id || employee.employee_id // Handle both record and employee objects
        });
        setShowDetailModal(true);
    }

    function formatTime(isoString: string) {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (loading && !refreshing) {
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
            >
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={THEME.colors.text.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchBar}
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={THEME.colors.text.muted}
                    />
                </View>

                <View style={styles.statsGrid}>
                    <ModernCard style={[styles.statCard, { borderLeftColor: THEME.colors.success, borderLeftWidth: 4 }]}>
                        <Text style={[styles.statValue, { color: THEME.colors.success }]}>{presentCount}</Text>
                        <Text style={styles.statLabel}>Present</Text>
                    </ModernCard>
                    <ModernCard style={[styles.statCard, { borderLeftColor: THEME.colors.error, borderLeftWidth: 4 }]}>
                        <Text style={[styles.statValue, { color: THEME.colors.error }]}>{absentCount}</Text>
                        <Text style={styles.statLabel}>Absent</Text>
                    </ModernCard>
                    <ModernCard style={[styles.statCard, { borderLeftColor: THEME.colors.info, borderLeftWidth: 4 }]}>
                        <Text style={[styles.statValue, { color: THEME.colors.info }]}>{totalEmployees}</Text>
                        <Text style={styles.statLabel}>Total Staff</Text>
                    </ModernCard>
                </View>

                {/* Checked In List */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIndicator} />
                        <Text style={styles.sectionTitle}>Currently Working ({checkedIn.length})</Text>
                    </View>
                    {checkedIn.length === 0 ? (
                        <Text style={styles.emptyText}>No active check-ins for today.</Text>
                    ) : (
                        filteredCheckedIn.map(record => (
                            <TouchableOpacity key={record.id} onPress={() => handleEmployeePress({
                                ...record.employee,
                                id: record.employee_id,
                                department: record.employee.team?.name
                            })}>
                                <ModernCard style={styles.empCard}>
                                    <View style={styles.empInfo}>
                                        <View>
                                            <Text style={styles.empName}>{record.employee.first_name} {record.employee.last_name}</Text>
                                            <Text style={styles.empTitle}>{record.employee.job_title}</Text>
                                        </View>
                                        <View style={styles.statusBadge}>
                                            <View style={styles.activeDot} />
                                            <Text style={styles.statusText}>IN: {formatTime(record.check_in_time)}</Text>
                                        </View>
                                    </View>
                                </ModernCard>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Absent List */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIndicator, { backgroundColor: THEME.colors.error }]} />
                        <Text style={styles.sectionTitle}>Absent Today ({absent.length})</Text>
                    </View>
                    {absent.length === 0 ? (
                        <Text style={styles.emptyText}>Full attendance today!</Text>
                    ) : (
                        filteredAbsent.map(emp => (
                            <TouchableOpacity key={emp.id} onPress={() => handleEmployeePress(emp)}>
                                <ModernCard style={styles.empCard}>
                                    <View style={styles.empInfo}>
                                        <View>
                                            <Text style={styles.empName}>{emp.first_name} {emp.last_name}</Text>
                                            <Text style={styles.empTitle}>{emp.job_title}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: THEME.colors.error + '10' }]}>
                                            <Text style={[styles.statusText, { color: THEME.colors.error }]}>ABSENT</Text>
                                        </View>
                                    </View>
                                </ModernCard>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Completed List */}
                {completed.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIndicator, { backgroundColor: THEME.colors.text.muted }]} />
                            <Text style={styles.sectionTitle}>Shift Completed ({completed.length})</Text>
                        </View>
                        {filteredCompleted.map(record => (
                            <ModernCard key={record.id} style={[styles.empCard, { opacity: 0.7 }]}>
                                <View style={styles.empInfo}>
                                    <View>
                                        <Text style={styles.empName}>{record.employee.first_name} {record.employee.last_name}</Text>
                                        <Text style={styles.empTitle}>{record.employee.job_title}</Text>
                                    </View>
                                    <View style={styles.timeInfo}>
                                        <Text style={styles.timeDetail}>In: {formatTime(record.check_in_time)}</Text>
                                        <Text style={styles.timeDetail}>Out: {formatTime(record.check_out_time!)}</Text>
                                    </View>
                                </View>
                            </ModernCard>
                        ))}
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>

            <EmployeeDetailModal
                visible={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                employee={selectedEmployee}
                loadingStats={loadingStats}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: THEME.spacing.lg,
        paddingVertical: THEME.spacing.md,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: '#f8f9fa' },
    refreshBtn: { padding: 8, borderRadius: 12, backgroundColor: THEME.colors.primary + '10' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.colors.text.primary },
    scrollContent: { padding: THEME.spacing.lg },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchIcon: { marginRight: 12 },
    searchBar: { flex: 1, paddingVertical: 14, fontSize: 15, color: THEME.colors.text.primary },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    statCard: { flex: 1, padding: 16, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
    statLabel: { fontSize: 11, color: THEME.colors.text.muted, fontWeight: '600', textTransform: 'uppercase' },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionIndicator: { width: 4, height: 16, borderRadius: 2, backgroundColor: THEME.colors.success },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: THEME.colors.text.primary },
    emptyText: { textAlign: 'center', color: THEME.colors.text.muted, fontSize: 14, fontStyle: 'italic', marginTop: 8 },
    empCard: { padding: 16, marginBottom: 12 },
    empInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    empName: { fontSize: 15, fontWeight: 'bold', color: THEME.colors.text.primary },
    empTitle: { fontSize: 12, color: THEME.colors.text.secondary, marginTop: 2 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.colors.success + '10',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6
    },
    activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.colors.success },
    statusText: { fontSize: 11, fontWeight: 'bold', color: THEME.colors.success },
    timeInfo: { alignItems: 'flex-end' },
    timeDetail: { fontSize: 11, color: THEME.colors.text.secondary, fontWeight: '500' }
});
