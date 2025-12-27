import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import DepartmentCalendar from '../../../src/components/DepartmentCalendar';
import DepartmentReports from '../../../src/components/DepartmentReports';
import ManageLeadersModal from '../../../src/components/ManageLeadersModal';
import EmployeeDetailModal from '../../../src/components/EmployeeDetailModal';
import AddMemberModal from '../../../src/components/AddMemberModal';
import { Alert, Platform } from 'react-native';

export default function DepartmentDetail() {
    const { id } = useLocalSearchParams();
    const teamId = Array.isArray(id) ? id[0] : id;
    const { user } = useAuth();

    const [team, setTeam] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'reports' | 'requests'>('overview');
    const [loading, setLoading] = useState(true);

    // Leader Management
    const [showLeadersModal, setShowLeadersModal] = useState(false);
    const [eligibleManagers, setEligibleManagers] = useState<any[]>([]);

    // Employee Details
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

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

            // 4. Load Eligible Managers & Current Role
            const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user?.id).single();
            if (profile) {
                setCurrentUserRole(profile.role);
                const { data: allStaff } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email, role')
                    .eq('company_id', profile.company_id)
                    .in('role', ['employee', 'manager']);

                setEligibleManagers(allStaff || []);
            }

            // 5. Load Pending Leave Requests for Team
            const { data: requests } = await supabase
                .from('leave_requests')
                .select(`
                    id, start_date, end_date, type, status, reason,
                    profiles:employee_id (first_name, last_name)
                `)
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
        // Web compatible confirm
        const confirmMsg = "Remove this member from the department?";

        if (Platform.OS === 'web') {
            if (!window.confirm(confirmMsg)) return;
        } else {
            Alert.alert('Confirm', confirmMsg, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => performRemove(memberId) }
            ]);
            return;
        }
        performRemove(memberId);
    }

    async function performRemove(memberId: string) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ team_id: null })
                .eq('id', memberId);

            if (error) throw error;
            loadTeamData();
        } catch (error: any) {
            Alert.alert('Error', error.message);
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

                {/* Admin Actions */}
                {['admin', 'ceo', 'hr'].includes(currentUserRole) && (
                    <TouchableOpacity
                        style={styles.manageButton}
                        onPress={() => setShowLeadersModal(true)}
                    >
                        <Text style={styles.manageButtonText}>Manage Leaders</Text>
                    </TouchableOpacity>
                )}

                {/* Manager Actions */}
                {['manager', 'admin', 'ceo'].includes(currentUserRole) && (
                    <TouchableOpacity
                        style={[styles.manageButton, { marginLeft: 8, backgroundColor: '#e8f5e9' }]}
                        onPress={() => setShowAddMemberModal(true)}
                    >
                        <Text style={[styles.manageButtonText, { color: '#2e7d32' }]}>Add Member</Text>
                    </TouchableOpacity>
                )}
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
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                    onPress={() => setActiveTab('requests')}
                >
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
                    {leaveRequests.length > 0 && <View style={styles.badgeDot} />}
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
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.memberName}>{member.first_name} {member.last_name}</Text>
                                        <Text style={styles.memberRole}>{member.role}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[
                                            styles.statusBadge,
                                            member.status === 'Present' ? styles.statusPresent :
                                                member.status === 'Checked Out' ? styles.statusCheckedOut :
                                                    styles.statusAbsent
                                        ]}>
                                            <Text style={styles.statusText}>{member.status}</Text>
                                        </View>
                                        {/* Remove Button for Managers/Admins */}
                                        {['manager', 'admin', 'ceo'].includes(currentUserRole) && (
                                            <TouchableOpacity
                                                onPress={(e) => {
                                                    e.stopPropagation(); // Prevent opening detail modal
                                                    removeMember(member.id);
                                                }}
                                                style={{ padding: 8, backgroundColor: '#ffebee', borderRadius: 4, marginLeft: 8 }}
                                            >
                                                <Text style={{ color: '#d32f2f', fontSize: 10, fontWeight: 'bold' }}>REMOVE</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                )}

                {activeTab === 'calendar' && <DepartmentCalendar teamId={teamId} />}
                {activeTab === 'reports' && <DepartmentReports teamId={teamId} />}
                {activeTab === 'requests' && (
                    <ScrollView style={styles.page}>
                        <Text style={styles.sectionTitle}>Pending Requests ({leaveRequests.length})</Text>
                        {leaveRequests.length === 0 ? (
                            <Text style={{ fontStyle: 'italic', color: '#999' }}>No pending leave requests.</Text>
                        ) : (
                            leaveRequests.map(req => (
                                <View key={req.id} style={styles.requestCard}>
                                    <View>
                                        <Text style={styles.reqName}>{req.profiles.first_name} {req.profiles.last_name}</Text>
                                        <Text style={styles.reqType}>{req.type} • {req.start_date} to {req.end_date}</Text>
                                        <Text style={styles.reqReason} numberOfLines={1}>{req.reason}</Text>
                                    </View>
                                    <View style={styles.reqBadge}>
                                        <Text style={styles.reqBadgeText}>PENDING</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
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

            <AddMemberModal
                visible={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                teamId={teamId}
                onUpdate={loadTeamData}
            />
        </View >
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
    statusText: { fontSize: 12, fontWeight: '500', color: '#333' },
    badgeDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#f44336',
        position: 'absolute', top: 12, right: -10
    },
    requestCard: {
        backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
    },
    reqName: { fontSize: 16, fontWeight: '500' },
    reqType: { fontSize: 12, color: '#666', marginTop: 2 },
    reqReason: { fontSize: 12, color: '#999', marginTop: 2, fontStyle: 'italic' },
    reqBadge: { backgroundColor: '#fff3e0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    reqBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#e65100' }
});
