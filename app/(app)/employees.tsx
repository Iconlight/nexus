import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import EditEmployeeModal from '../../src/components/EditEmployeeModal';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';

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
    const [loading, setLoading] = useState(true);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);

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

    async function loadEmployees() {
        try {
            // Get current user's company_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            // Load all employees in the company
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    team:teams(name)
                `)
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false });

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
            const msg = 'Please fill in all required fields (name, email, job title, base salary)';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const msg = 'Please enter a valid email address';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
            return;
        }

        setInviting(true);

        try {
            // Get session token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('Not authenticated');
            }

            // Call Edge Function to invite employee
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

            console.log('Inviting employee:', { firstName, lastName, email, role });

            const response = await fetch(
                `${supabaseUrl}/functions/v1/invite-employee`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`, // Use session token instead of anon key
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        email,
                        phone,
                        role,
                        jobTitle,
                        workingDays: parseInt(workingDays),
                        workingHours: parseFloat(workingHours),
                        allowedLeaveDays: parseInt(leaveDays),
                        baseSalary: parseFloat(baseSalary),
                        teamId: selectedDepartment || null,
                        gender: gender || null,
                    }),
                }
            );

            const data = await response.json();

            console.log('Invite response:', { status: response.status, data });

            if (!response.ok) {
                throw new Error(data.error || 'Failed to invite employee');
            }

            const msg = 'Employee invited successfully! Invitation email sent with login credentials.';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            // Reset form
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhone('');
            setRole('employee');
            setJobTitle('');
            setWorkingDays('5');
            setWorkingHours('8');
            setLeaveDays('21');
            setBaseSalary('');
            setSelectedDepartment('');
            setGender('');
            setShowInviteForm(false);

            // Reload employees
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

            const msg = 'Employee updated successfully';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            setShowEditModal(false);
            setEditingEmployee(null);
            loadEmployees();
        } catch (error: any) {
            console.error('Update error:', error);
            const msg = error.message || 'Failed to update employee';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        }
    }

    function openEditModal(emp: Employee) {
        setEditingEmployee(emp);
        setShowEditModal(true);
    }

    async function removeEmployee(employeeId: string, employeeName: string) {
        const confirmMsg = `Are you sure you want to remove ${employeeName}? They will be deactivated and unable to login.`;

        const confirmed = Platform.OS === 'web'
            ? window.confirm(confirmMsg)
            : await new Promise((resolve) => {
                Alert.alert(
                    'Confirm Removal',
                    confirmMsg,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'Remove', style: 'destructive', onPress: () => resolve(true) }
                    ]
                );
            });

        if (!confirmed) return;

        try {
            // Soft delete: set is_active to false
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: false })
                .eq('id', employeeId);

            if (error) throw error;

            const msg = `${employeeName} has been removed successfully`;
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
            loadEmployees();
        } catch (error: any) {
            const msg = error.message || 'Failed to remove employee';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading employees...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Employee Management</Text>
                <Button
                    title={showInviteForm ? "Cancel" : "Invite Employee"}
                    onPress={() => setShowInviteForm(!showInviteForm)}
                />
            </View>

            {showInviteForm && (
                <View style={styles.inviteForm}>
                    <Text style={styles.formTitle}>Invite New Employee</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="First Name *"
                        value={firstName}
                        onChangeText={setFirstName}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Last Name *"
                        value={lastName}
                        onChangeText={setLastName}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Email *"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Phone (optional)"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.label}>Job Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Software Engineer"
                        value={jobTitle}
                        onChangeText={setJobTitle}
                    />

                    <Text style={styles.label}>Working Schedule</Text>
                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.subLabel}>Days/Week *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="5"
                                value={workingDays}
                                onChangeText={setWorkingDays}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.subLabel}>Hours/Day *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="8"
                                value={workingHours}
                                onChangeText={setWorkingHours}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Compensation & Benefits</Text>
                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.subLabel}>Leave Days/Year *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="21"
                                value={leaveDays}
                                onChangeText={setLeaveDays}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.subLabel}>Base Salary *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="5000"
                                value={baseSalary}
                                onChangeText={setBaseSalary}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Role:</Text>
                    <View style={styles.roleButtons}>
                        {['employee', 'manager', 'hr', 'finance'].map((r) => (
                            <Button
                                key={r}
                                title={r.charAt(0).toUpperCase() + r.slice(1)}
                                onPress={() => setRole(r)}
                                color={role === r ? '#2196f3' : '#999'}
                            />
                        ))}
                    </View>

                    <Text style={styles.label}>Gender (optional):</Text>
                    <View style={styles.roleButtons}>
                        {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                            <Button
                                key={g}
                                title={g.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                onPress={() => setGender(g)}
                                color={gender === g ? '#2196f3' : '#999'}
                            />
                        ))}
                    </View>

                    <Text style={styles.label}>Department (optional):</Text>
                    <View style={styles.roleButtons}>
                        <Button
                            title="None"
                            onPress={() => setSelectedDepartment('')}
                            color={selectedDepartment === '' ? '#2196f3' : '#999'}
                        />
                        {departments.map((dept) => (
                            <Button
                                key={dept.id}
                                title={dept.name}
                                onPress={() => setSelectedDepartment(dept.id)}
                                color={selectedDepartment === dept.id ? '#2196f3' : '#999'}
                            />
                        ))}
                    </View>

                    <Button
                        title={inviting ? "Inviting..." : "Send Invitation"}
                        onPress={inviteEmployee}
                        disabled={inviting}
                    />
                </View>
            )}

            <View style={styles.employeeList}>
                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>Employees ({employees.filter(e => showInactive || e.is_active).length})</Text>
                    <Button
                        title={showInactive ? "Hide Inactive" : "Show Inactive"}
                        onPress={() => setShowInactive(!showInactive)}
                        color="#666"
                    />
                </View>

                {employees
                    .filter(emp => showInactive || emp.is_active)
                    .map((emp) => (
                        <View key={emp.id} style={[
                            styles.employeeCard,
                            !emp.is_active && styles.inactiveCard
                        ]}>
                            <View style={styles.employeeInfo}>
                                <Text style={styles.employeeName}>
                                    {emp.first_name} {emp.last_name}
                                    {!emp.is_active && <Text style={styles.inactiveLabel}> (Inactive)</Text>}
                                </Text>
                                {emp.job_title && (
                                    <Text style={styles.jobTitle}>{emp.job_title}</Text>
                                )}
                                {emp.team && (
                                    <View style={styles.deptBadge}>
                                        <Text style={styles.deptText}>🏢 {emp.team.name}</Text>
                                    </View>
                                )}
                                <Text style={styles.employeeEmail}>{emp.email}</Text>
                                {(emp.working_days_per_week || emp.working_hours_per_day || emp.allowed_leave_days) && (
                                    <Text style={styles.employeeDetails}>
                                        {emp.working_days_per_week && `${emp.working_days_per_week} days/week`}
                                        {emp.working_hours_per_day && ` • ${emp.working_hours_per_day}h/day`}
                                        {emp.allowed_leave_days && ` • ${emp.allowed_leave_days} leave days`}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.employeeActions}>
                                <View style={[styles.badge, !emp.is_active && styles.inactiveBadge]}>
                                    <Text style={styles.badgeText}>
                                        {emp.role.toUpperCase()}
                                    </Text>
                                </View>
                                {emp.is_active && (
                                    <>
                                        <Button
                                            title="Edit"
                                            onPress={() => openEditModal(emp)}
                                        />
                                        <Button
                                            title="Remove"
                                            onPress={() => removeEmployee(emp.id, `${emp.first_name} ${emp.last_name}`)}
                                            color="#d32f2f"
                                        />
                                    </>
                                )}
                            </View>
                        </View>
                    ))}
            </View>


            {/* Edit Modal */}
            {/* Edit Modal Component */}
            <EditEmployeeModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                employee={editingEmployee}
                departments={departments}
                onUpdate={handleUpdateEmployee}
            />
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: 'white',
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    inviteForm: {
        backgroundColor: 'white',
        margin: 16,
        padding: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 8,
    },
    subLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
        color: '#666',
    },
    roleButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 8,
    },
    employeeList: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    employeeCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeActions: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
    },
    employeeName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    employeeEmail: {
        fontSize: 14,
        color: '#666',
    },
    badge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    inactiveBadge: {
        backgroundColor: '#ffebee',
    },
    badgeText: {
        color: '#1976d2',
        fontSize: 12,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    halfInput: {
        flex: 1,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    jobTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2196f3',
        marginBottom: 2,
    },
    employeeDetails: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    inactiveCard: {
        opacity: 0.6,
        backgroundColor: '#f5f5f5',
    },


    deptBadge: {
        backgroundColor: '#f3e5f5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    deptText: {
        fontSize: 12,
        color: '#7b1fa2',
        fontWeight: '500',
    },
    inactiveLabel: {
        color: '#d32f2f',
        fontSize: 12,
        fontWeight: '600',
    },
});
