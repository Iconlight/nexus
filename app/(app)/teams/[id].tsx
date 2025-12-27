import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import DepartmentCalendar from '../../../src/components/DepartmentCalendar';
import DepartmentReports from '../../../src/components/DepartmentReports';
import ManageLeadersModal from '../../../src/components/ManageLeadersModal';
import EmployeeDetailModal from '../../../src/components/EmployeeDetailModal';

export default function DepartmentDetail() {
    const { id } = useLocalSearchParams();
    const teamId = Array.isArray(id) ? id[0] : id;
    const { user } = useAuth();

    const [team, setTeam] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'reports'>('overview');
    const [loading, setLoading] = useState(true);

    // Leader Management
    const [showLeadersModal, setShowLeadersModal] = useState(false);
    const [eligibleManagers, setEligibleManagers] = useState<any[]>([]);

    // Employee Details
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    useEffect(() => {
        if (teamId) {
            loadTeamData();
        }
    }, [teamId]);

    async function loadTeamData() {
        setLoading(true);
        try {
            // 1. Get Team Details
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();

            if (teamError) throw teamError;
            setTeam(teamData);

            // 2. Get Members with detailed info
            const { data: membersData, error: membersError } = await supabase
                .from('profiles')
                .select('*')
                .eq('team_id', teamId);

            if (membersError) throw membersError;

            // 3. Get Check-in status
            const today = new Date().toISOString().split('T')[0];
            const { data: attendance } = await supabase
                .from('attendance_logs')
                .select('employee_id, check_in_time, check_out_time')
                .eq('date', today)
                .in('employee_id', membersData?.map(m => m.id) || []);

            const enrichedMembers = membersData?.map(m => {
                const log = attendance?.find(a => a.employee_id === m.id);
                return {
                    ...m,
                    status: log ? (log.check_out_time ? 'Checked Out' : 'Present') : 'Absent',
                    check_in_time: log?.check_in_time
                };
            }) || [];

            setMembers(enrichedMembers);

            // 4. Load Eligible Managers (for promotion modal)
            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
            if (profile) {
                const { data: allStaff } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email, role')
                    .eq('company_id', profile.company_id)
                    .in('role', ['employee', 'manager']);

                setEligibleManagers(allStaff || []);
            }

        } catch (error) {
            console.error('Error loading team:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#2196f3" /></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{team?.name}</Text>
                    <Text style={styles.subtitle}>{team?.description || 'No description'}</Text>
                </View>
                <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => setShowLeadersModal(true)}
                >
                    <Text style={styles.manageButtonText}>Manage Leaders</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
                    onPress={() => setActiveTab('overview')}
                >
                    <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'calendar' && styles.activeTab]}
                    onPress={() => setActiveTab('calendar')}
                >
                    <Text style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>Calendar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
                    onPress={() => setActiveTab('reports')}
                >
                    <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>Reports</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {activeTab === 'overview' && (
                    <ScrollView style={styles.page}>
                        <View style={styles.rosterSection}>
                            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
                            {members.map(member => (
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
                    </ScrollView>
                )}

                {activeTab === 'calendar' && <DepartmentCalendar teamId={teamId} />}
                {activeTab === 'reports' && <DepartmentReports teamId={teamId} />}
            </View>

            <ManageLeadersModal
                visible={showLeadersModal}
                onClose={() => setShowLeadersModal(false)}
                teamId={teamId}
                teamName={team?.name}
                eligibleManagers={eligibleManagers}
                onUpdate={loadTeamData}
            />

            <EmployeeDetailModal
                visible={!!selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
                employee={selectedEmployee}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 20,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    manageButton: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    manageButtonText: {
        color: '#2196f3',
        fontWeight: '600',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tab: {
        paddingVertical: 16,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#2196f3',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#2196f3',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    page: {
        flex: 1,
        padding: 16,
    },
    rosterSection: {
        marginBottom: 24,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
