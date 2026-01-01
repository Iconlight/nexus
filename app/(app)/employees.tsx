import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import EditEmployeeModal from '../../src/components/EditEmployeeModal';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    is_active: boolean;
    job_title?: string;
    working_days_per_week?: number;
    working_hours_per_day?: number;
    allowed_leave_days?: number;
    team_id?: string;
    team?: { name: string };
    gender?: string;
    base_salary?: number;
};

type Department = {
    id: string;
    name: string;
};

export default function Employees() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Invite form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('employee');
    const [jobTitle, setJobTitle] = useState('');
    const [workingDays, setWorkingDays] = useState('5');
    const [workingHours, setWorkingHours] = useState('8');
    const [leaveDays, setLeaveDays] = useState('21');
    const [baseSalary, setBaseSalary] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [gender, setGender] = useState('');
    const [inviting, setInviting] = useState(false);

    // Edit state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        loadEmployees();
        loadDepartments();
    }, []);

    useEffect(() => {
        const filtered = employees.filter(emp => {
            const matchesSearch = `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.job_title?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = showInactive || emp.is_active;
            return matchesSearch && matchesStatus;
        });
        setFilteredEmployees(filtered);
    }, [searchQuery, showInactive, employees]);

    async function loadEmployees() {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*, team:teams(name)')
                .eq('company_id', profile.company_id)
                .order('first_name', { ascending: true });

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadDepartments() {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            const { data, error } = await supabase
                .from('teams')
                .select('id, name')
                .eq('company_id', profile.company_id)
                .order('name');

            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    }

    async function inviteEmployee() {
        if (!firstName || !lastName || !email || !jobTitle || !baseSalary) {
            const msg = 'Please fill in all required fields';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
            return;
        }

        setInviting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const response = await fetch(`${supabaseUrl}/functions/v1/invite-employee`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    firstName, lastName, email, phone, role, jobTitle,
                    workingDays: parseInt(workingDays),
                    workingHours: parseFloat(workingHours),
                    allowedLeaveDays: parseInt(leaveDays),
                    baseSalary: parseFloat(baseSalary),
                    teamId: selectedDepartment || null,
                    gender: gender || null,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to invite employee');

            const msg = 'Employee invited successfully!';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            setShowInviteForm(false);
            loadEmployees();
        } catch (error: any) {
            console.error('Invite error:', error);
            const msg = error.message || 'Failed to invite employee';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setInviting(false);
        }
    }

    async function handleUpdateEmployee(updates: any) {
        if (!editingEmployee) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', editingEmployee.id);

            if (error) throw error;
            setShowEditModal(false);
            loadEmployees();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    }

    async function removeEmployee(employeeId: string, employeeName: string) {
        const confirmMsg = `Are you sure you want to deactivate ${employeeName}?`;
        const confirmed = Platform.OS === 'web' ? window.confirm(confirmMsg) : await new Promise(r => Alert.alert('Confirm', confirmMsg, [{ text: 'Cancel', onPress: () => r(false) }, { text: 'Deactivate', onPress: () => r(true) }]));

        if (!confirmed) return;

        try {
            const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', employeeId);
            if (error) throw error;
            loadEmployees();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    }

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
                <TouchableOpacity
                    style={[styles.inviteToggle, { backgroundColor: showInviteForm ? THEME.colors.error : THEME.colors.primary }]}
                    onPress={() => setShowInviteForm(!showInviteForm)}
                >
                    <Ionicons name={showInviteForm ? "close" : "person-add"} size={20} color="white" />
                    <Text style={styles.inviteToggleText}>{showInviteForm ? "Cancel" : "Invite"}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {showInviteForm && (
                    <ModernCard style={styles.formCard}>
                        <Text style={styles.sectionHeading}>Invitation Details</Text>
                        <View style={styles.inputGroup}>
                            <View style={styles.row}>
                                <TextInput style={[styles.input, styles.half]} placeholder="First Name *" value={firstName} onChangeText={setFirstName} />
                                <TextInput style={[styles.input, styles.half]} placeholder="Last Name *" value={lastName} onChangeText={setLastName} />
                            </View>
                            <TextInput style={styles.input} placeholder="Email Address *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                            <TextInput style={styles.input} placeholder="Job Title *" value={jobTitle} onChangeText={setJobTitle} />
                            <TextInput style={styles.input} placeholder="Base Salary *" value={baseSalary} onChangeText={setBaseSalary} keyboardType="numeric" />
                        </View>

                        <Text style={styles.fieldLabel}>Role</Text>
                        <View style={styles.tabContainer}>
                            {['employee', 'manager', 'hr', 'finance'].map(r => (
                                <TouchableOpacity key={r} style={[styles.tab, role === r && styles.activeTab]} onPress={() => setRole(r)}>
                                    <Text style={[styles.tabText, role === r && styles.activeTabText]}>{r.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={inviteEmployee} disabled={inviting}>
                            {inviting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Send invitation Email</Text>}
                        </TouchableOpacity>
                    </ModernCard>
                )}

                <View style={styles.listHeader}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color={THEME.colors.text.muted} />
                        <TextInput
                            style={styles.searchField}
                            placeholder="Find member..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity onPress={() => setShowInactive(!showInactive)} style={styles.filterBtn}>
                        <Ionicons name={showInactive ? "eye" : "eye-off"} size={20} color={THEME.colors.primary} />
                    </TouchableOpacity>
                </View>

                {filteredEmployees.map((emp) => (
                    <ModernCard key={emp.id} style={[styles.employeeCard, !emp.is_active && styles.inactiveCard]}>
                        <View style={styles.cardMain}>
                            <View style={styles.empAvatar}>
                                <Text style={styles.empAvatarText}>{emp.first_name[0]}{emp.last_name[0]}</Text>
                            </View>
                            <View style={styles.empInfo}>
                                <Text style={styles.empName}>{emp.first_name} {emp.last_name}</Text>
                                <Text style={styles.empTitle}>{emp.job_title || 'Team Member'}</Text>
                                <View style={styles.roleTag}>
                                    <View style={[styles.dot, { backgroundColor: emp.is_active ? THEME.colors.success : THEME.colors.error }]} />
                                    <Text style={styles.roleTagText}>{emp.role.toUpperCase()}</Text>
                                </View>
                            </View>
                            <View style={styles.empActions}>
                                <TouchableOpacity onPress={() => { setEditingEmployee(emp); setShowEditModal(true); }} style={styles.actionIcon}>
                                    <Ionicons name="create-outline" size={20} color={THEME.colors.primary} />
                                </TouchableOpacity>
                                {emp.is_active && (
                                    <TouchableOpacity onPress={() => removeEmployee(emp.id, `${emp.first_name} ${emp.last_name}`)} style={styles.actionIcon}>
                                        <Ionicons name="trash-outline" size={20} color={THEME.colors.error} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={styles.cardFooter}>
                            <View style={styles.footerItem}>
                                <Ionicons name="mail-outline" size={14} color={THEME.colors.text.muted} />
                                <Text style={styles.footerText}>{emp.email}</Text>
                            </View>
                            {emp.team && (
                                <View style={styles.footerItem}>
                                    <Ionicons name="business-outline" size={14} color={THEME.colors.text.muted} />
                                    <Text style={styles.footerText}>{emp.team.name}</Text>
                                </View>
                            )}
                        </View>
                    </ModernCard>
                ))}
            </ScrollView>

            <EditEmployeeModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                employee={editingEmployee}
                departments={departments}
                onUpdate={handleUpdateEmployee}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: THEME.spacing.lg, backgroundColor: 'white' },
    backBtn: { padding: 8, marginLeft: -8 },
    title: { fontSize: 24, fontWeight: 'bold', color: THEME.colors.text.primary },
    inviteToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, gap: 6 },
    inviteToggleText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    scrollContent: { padding: THEME.spacing.lg },
    formCard: { padding: THEME.spacing.lg, marginBottom: THEME.spacing.xl },
    sectionHeading: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: THEME.colors.text.primary },
    inputGroup: { gap: 12 },
    input: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee', fontSize: 15 },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: THEME.colors.text.secondary, marginTop: 16, marginBottom: 8 },
    tabContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0' },
    activeTab: { backgroundColor: THEME.colors.primary },
    tabText: { fontSize: 12, fontWeight: 'bold', color: THEME.colors.text.secondary },
    activeTabText: { color: 'white' },
    submitBtn: { backgroundColor: THEME.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    listHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#eee' },
    searchField: { flex: 1, marginLeft: 10, fontSize: 15 },
    filterBtn: { width: 48, height: 48, backgroundColor: 'white', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    employeeCard: { padding: 16, marginBottom: 12 },
    cardMain: { flexDirection: 'row', alignItems: 'center' },
    empAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: THEME.colors.primary, justifyContent: 'center', alignItems: 'center' },
    empAvatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    empInfo: { flex: 1, marginLeft: 16 },
    empName: { fontSize: 16, fontWeight: 'bold', color: THEME.colors.text.primary },
    empTitle: { fontSize: 13, color: THEME.colors.text.secondary, marginTop: 2 },
    roleTag: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    roleTagText: { fontSize: 10, fontWeight: 'bold', color: THEME.colors.text.muted },
    empActions: { flexDirection: 'row', gap: 8 },
    actionIcon: { padding: 8, backgroundColor: '#f5f5f5', borderRadius: 10 },
    cardFooter: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 16 },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 12, color: THEME.colors.text.muted },
    inactiveCard: { opacity: 0.6 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});


