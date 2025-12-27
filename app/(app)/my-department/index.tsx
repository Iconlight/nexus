import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import EmployeeDetailModal from '../../../src/components/EmployeeDetailModal';

export default function MyDepartment() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [teamName, setTeamName] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    useEffect(() => {
        loadDepartmentData();
    }, []);

    async function loadDepartmentData() {
        try {
            // 1. Get teams managed by user
            const { data: managerData, error: managerError } = await supabase
                .from('team_managers')
                .select('team_id, teams(name)')
                .eq('manager_id', user?.id)
                .single(); // Assuming one department for now, or pick first

            if (managerError || !managerData) {
                // Not a manager or error
                return;
            }

            setTeamName((managerData.teams as any)?.name);

            // 2. Get employees in this team
            const { data: employees, error: empError } = await supabase
                .from('profiles')
                .select('*')
                .eq('team_id', managerData.team_id);

            if (empError) throw empError;

            // 3. Get check-in status for today
            const today = new Date().toISOString().split('T')[0];
            const { data: attendance, error: attError } = await supabase
                .from('attendance_logs')
                .select('employee_id, check_in_time, check_out_time')
                .eq('date', today)
                .in('employee_id', employees.map(e => e.id));

            if (attError) throw attError;

            // Merge data
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
        }
    }

    if (loading) return <View style={styles.container}><Text>Loading...</Text></View>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{teamName || 'My Department'}</Text>
                <Text style={styles.subtitle}>{teamMembers.length} Members</Text>
            </View>

            <View style={styles.actionGrid}>
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/(app)/my-department/calendar')}
                >
                    <Text style={styles.actionTitle}>Calendar</Text>
                    <Text style={styles.actionDesc}>Manage Activities</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/(app)/my-department/reports')}
                >
                    <Text style={styles.actionTitle}>Reports</Text>
                    <Text style={styles.actionDesc}>Submit Reports</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/(app)/approvals')}
                >
                    <Text style={styles.actionTitle}>Approvals</Text>
                    <Text style={styles.actionDesc}>Leave Requests</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Team Members</Text>
                {teamMembers.map(member => (
                    <TouchableOpacity
                        key={member.id}
                        style={styles.memberCard}
                        onPress={() => setSelectedEmployee(member)}
                    >
                        <View>
                            <Text style={styles.memberName}>{member.first_name} {member.last_name}</Text>
                            <Text style={styles.memberRole}>{member.role}</Text>
                        </View>
                        <View style={[
                            styles.statusBadge,
                            member.status === 'Present' ? styles.statusPresent :
                                member.status === 'Checked Out' ? styles.statusCheckedOut :
                                    styles.statusAbsent
                        ]}>
                            <Text style={styles.statusText}>{member.status}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <EmployeeDetailModal
                visible={!!selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
                employee={selectedEmployee}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        color: '#666',
        marginTop: 4,
    },
    actionGrid: {
        flexDirection: 'row',
        padding: 16, // Fixed padding
        gap: 12, // Gap takes care of spacing
    },
    actionCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        color: '#2196f3',
    },
    actionDesc: {
        fontSize: 12,
        color: '#999',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    memberCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
    },
    memberRole: {
        fontSize: 12,
        color: '#999',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusPresent: { backgroundColor: '#e8f5e9' },
    statusCheckedOut: { backgroundColor: '#fff3e0' },
    statusAbsent: { backgroundColor: '#ffebee' },
    statusText: { fontSize: 12, fontWeight: '500', color: '#333' }
});
