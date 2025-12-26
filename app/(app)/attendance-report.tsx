import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform, Alert, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import EmployeeDetailModal from '../../src/components/EmployeeDetailModal';

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

            // 1. Get current user's profile to check company_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id, role')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            // 2. Get all active employees for this company
            const { data: allEmployees, error: empError } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', profile.company_id)
                .eq('is_active', true)
                .neq('role', 'admin') // Optional: Exclude admins from attendance list
                .neq('role', 'ceo');

            if (empError) throw empError;

            // 3. Get today's attendance logs
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

            // Process data
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

            // Find absent employees
            const absentList = allEmployees?.filter(emp => !presentEmployeeIds.has(emp.id)) || [];

            setCheckedIn(checkedInList);
            setCompleted(completedList);
            setAbsent(absentList);

            setTotalEmployees(allEmployees?.length || 0);
            setPresentCount(presentEmployeeIds.size);
            setAbsentCount(absentList.length);

        } catch (error: any) {
            console.error('Error loading attendance:', error);
            const msg = error.message || 'Failed to load attendance data';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = () => {
        setRefreshing(true);
        loadAttendanceData();
    };

    // Filter lists based on search
    const filteredCheckedIn = checkedIn.filter(r =>
        (r.employee.first_name + ' ' + r.employee.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employee.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAbsent = absent.filter(e =>
        (e.first_name + ' ' + e.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCompleted = completed.filter(r =>
        (r.employee.first_name + ' ' + r.employee.last_name).toLowerCase().includes(searchQuery.toLowerCase())
    );

    async function handleEmployeePress(employee: any) {
        setSelectedEmployee(employee);
        setShowDetailModal(true);
        setLoadingStats(true); // Start loading stats

        // Calculate Stats
        // 1. Days Present (count logs)
        // 2. Leave Used (sum leave requests)
        // 3. Attendance Rate (Present / Working Days since started)

        try {
            // Mock stats for now to demonstrate UI (Implementation would require more RPCs or complex queries)
            // In a real app, we'd fetch:
            // - count(attendance_logs) where employee_id = id
            // - count(leave_requests) where status = approved

            // Simulating a fetch delay
            await new Promise(resolve => setTimeout(resolve, 500));

            const stats = {
                daysPresent: Math.floor(Math.random() * 20) + 1, // Mock
                daysAbsent: Math.floor(Math.random() * 5),
                leavesUsed: Math.floor(Math.random() * 5),
                leavesAllowed: employee.allowed_leave_days || 21,
                attendanceRate: 85 + Math.random() * 15 // Mock 85-100%
            };

            setSelectedEmployee((prev: any) => ({ ...prev, stats }));

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    }

    function formatTime(isoString: string) {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <Text>Loading attendance report...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Attendance Overview</Text>
                <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>

                <TextInput
                    style={styles.searchBar}
                    placeholder="🔍 Search employees..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
                    <Text style={[styles.statValue, { color: '#1976d2' }]}>{presentCount}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#ffebee' }]}>
                    <Text style={[styles.statValue, { color: '#c62828' }]}>{absentCount}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#f5f5f5' }]}>
                    <Text style={[styles.statValue, { color: '#616161' }]}>{totalEmployees}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
            </View>

            {/* Currently Checked In */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🟢 Currently Checked In ({checkedIn.length})</Text>
                </View>
                {checkedIn.length === 0 ? (
                    <Text style={styles.emptyText}>No one currently checked in</Text>
                ) : (
                    filteredCheckedIn.map(record => (
                        <TouchableOpacity key={record.id} onPress={() => handleEmployeePress({
                            ...record.employee,
                            id: record.employee_id,
                            department: record.employee.team?.name // Map team to department
                        })}>
                            <View style={styles.card}>
                                <View style={styles.cardRow}>
                                    <View>
                                        <Text style={styles.name}>
                                            {record.employee.first_name} {record.employee.last_name}
                                        </Text>
                                        <Text style={styles.jobTitle}>
                                            {record.employee.job_title} • {record.employee.role.toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.timeBadge}>
                                        <Text style={styles.timeText}>In: {formatTime(record.check_in_time)}</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {/* Absent */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🔴 Absent ({absent.length})</Text>
                </View>
                {absent.length === 0 ? (
                    <Text style={styles.emptyText}>Everyone is present!</Text>
                ) : (
                    filteredAbsent.map(emp => (
                        <TouchableOpacity key={emp.id} onPress={() => handleEmployeePress({
                            ...emp,
                            department: emp.team?.name
                        })}>
                            <View style={[styles.card, styles.absentCard]}>
                                <View style={styles.cardRow}>
                                    <View>
                                        <Text style={styles.name}>
                                            {emp.first_name} {emp.last_name}
                                        </Text>
                                        <Text style={styles.jobTitle}>{emp.job_title}</Text>
                                    </View>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>Absent</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {/* Completed */}
            {completed.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🏁 Completed Workday ({completed.length})</Text>
                    </View>
                    {completed.map(record => (
                        <View key={record.id} style={[styles.card, styles.completedCard]}>
                            <View style={styles.cardRow}>
                                <View>
                                    <Text style={styles.name}>
                                        {record.employee.first_name} {record.employee.last_name}
                                    </Text>
                                    <Text style={styles.jobTitle}>{record.employee.job_title}</Text>
                                </View>
                                <View>
                                    <Text style={styles.timeDetail}>In: {formatTime(record.check_in_time)}</Text>
                                    <Text style={styles.timeDetail}>Out: {formatTime(record.check_out_time!)}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <View style={{ height: 40 }} />

            <EmployeeDetailModal
                visible={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                employee={selectedEmployee}
                loadingStats={loadingStats}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    date: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
        marginBottom: 12,
    },
    searchBar: {
        backgroundColor: '#f5f5f5',
        padding: 10,
        borderRadius: 8,
        fontSize: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textTransform: 'uppercase',
    },
    section: {
        padding: 16,
        paddingTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#444',
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    absentCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#ef5350',
    },
    completedCard: {
        opacity: 0.8,
        backgroundColor: '#f9f9f9',
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    jobTitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    timeBadge: {
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    timeText: {
        color: '#2e7d32',
        fontWeight: '600',
        fontSize: 12,
    },
    statusBadge: {
        backgroundColor: '#ffebee',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        color: '#c62828',
        fontSize: 12,
        fontWeight: '600',
    },
    timeDetail: {
        fontSize: 12,
        color: '#666',
        textAlign: 'right',
    },
});
