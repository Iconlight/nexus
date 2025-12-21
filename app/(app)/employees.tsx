import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    is_active: boolean;
};

export default function Employees() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteForm, setShowInviteForm] = useState(false);

    // Invite form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('employee');
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        loadEmployees();
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
                .select('*')
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

    async function inviteEmployee() {
        if (!firstName || !lastName || !email) {
            const msg = 'Please fill in all required fields';
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
            // Call Edge Function to invite employee
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            const response = await fetch(
                `${supabaseUrl}/functions/v1/invite-employee`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseKey}`,
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        email,
                        phone,
                        role,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to invite employee');
            }

            const msg = 'Employee invited successfully! They will receive an email with login instructions.';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            // Reset form
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhone('');
            setRole('employee');
            setShowInviteForm(false);

            // Reload employees
            loadEmployees();
        } catch (error: any) {
            const msg = error.message || 'Failed to invite employee';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setInviting(false);
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

                    <Button
                        title={inviting ? "Inviting..." : "Send Invitation"}
                        onPress={inviteEmployee}
                        disabled={inviting}
                    />
                </View>
            )}

            <View style={styles.employeeList}>
                <Text style={styles.sectionTitle}>Employees ({employees.length})</Text>

                {employees.map((emp) => (
                    <View key={emp.id} style={styles.employeeCard}>
                        <View style={styles.employeeInfo}>
                            <Text style={styles.employeeName}>
                                {emp.first_name} {emp.last_name}
                            </Text>
                            <Text style={styles.employeeEmail}>{emp.email}</Text>
                        </View>
                        <View style={[styles.badge, !emp.is_active && styles.inactiveBadge]}>
                            <Text style={styles.badgeText}>
                                {emp.role.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
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
});
