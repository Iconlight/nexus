import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
};

type PayrollRecord = {
    id: string;
    employee_id: string;
    month: string;
    base_salary: number;
    bonuses: number;
    deductions: number;
    net_salary: number;
    status: string;
    created_at: string;
    employee_name?: string;
    employee_email?: string;
};

export default function Payroll() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Form state
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [month, setMonth] = useState('');
    const [baseSalary, setBaseSalary] = useState('');
    const [bonuses, setBonuses] = useState('');
    const [deductions, setDeductions] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadData();
        // Set current month as default
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        setMonth(currentMonth);
    }, []);

    async function loadData() {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            // Load employees
            const { data: employeesData, error: employeesError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email')
                .eq('company_id', profile.company_id)
                .eq('is_active', true)
                .order('first_name');

            if (employeesError) throw employeesError;
            setEmployees(employeesData || []);

            // Load payroll records
            const { data: payrollData, error: payrollError } = await supabase
                .from('payroll_records')
                .select(`
          *,
          profiles!payroll_records_employee_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
                .eq('company_id', profile.company_id)
                .order('month', { ascending: false });

            if (payrollError) throw payrollError;

            const transformedData = (payrollData || []).map((record: any) => ({
                ...record,
                employee_name: record.profiles
                    ? `${record.profiles.first_name} ${record.profiles.last_name}`
                    : 'Unknown',
                employee_email: record.profiles?.email || '',
            }));

            setPayrolls(transformedData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function createPayroll() {
        if (!selectedEmployeeId || !month || !baseSalary) {
            const msg = 'Please fill in all required fields';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
            return;
        }

        setCreating(true);

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) {
                throw new Error('Company not found');
            }

            const base = parseFloat(baseSalary) || 0;
            const bonus = parseFloat(bonuses) || 0;
            const deduction = parseFloat(deductions) || 0;
            const net = base + bonus - deduction;

            const { error } = await supabase
                .from('payroll_records')
                .insert({
                    company_id: profile.company_id,
                    employee_id: selectedEmployeeId,
                    month,
                    base_salary: base,
                    bonuses: bonus,
                    deductions: deduction,
                    net_salary: net,
                    status: 'draft',
                });

            if (error) throw error;

            const msg = 'Payroll record created successfully!';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            // Reset form
            setSelectedEmployeeId('');
            setBaseSalary('');
            setBonuses('');
            setDeductions('');
            setShowCreateForm(false);

            loadData();
        } catch (error: any) {
            const msg = error.message || 'Failed to create payroll';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setCreating(false);
        }
    }

    async function publishPayroll(payrollId: string) {
        try {
            const { error } = await supabase
                .from('payroll_records')
                .update({ status: 'published' })
                .eq('id', payrollId);

            if (error) throw error;

            const msg = 'Payroll published successfully!';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            loadData();
        } catch (error: any) {
            const msg = error.message || 'Failed to publish payroll';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading payroll...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Payroll Management</Text>
                <Button
                    title={showCreateForm ? "Cancel" : "Create Payroll"}
                    onPress={() => setShowCreateForm(!showCreateForm)}
                />
            </View>

            {showCreateForm && (
                <View style={styles.createForm}>
                    <Text style={styles.formTitle}>Create Payroll Record</Text>

                    <Text style={styles.label}>Employee *</Text>
                    <View style={styles.pickerContainer}>
                        {employees.map((emp) => (
                            <Button
                                key={emp.id}
                                title={`${emp.first_name} ${emp.last_name}`}
                                onPress={() => setSelectedEmployeeId(emp.id)}
                                color={selectedEmployeeId === emp.id ? '#2196f3' : '#999'}
                            />
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Month (YYYY-MM-DD) *"
                        value={month}
                        onChangeText={setMonth}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Base Salary *"
                        value={baseSalary}
                        onChangeText={setBaseSalary}
                        keyboardType="numeric"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Bonuses (optional)"
                        value={bonuses}
                        onChangeText={setBonuses}
                        keyboardType="numeric"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Deductions (optional)"
                        value={deductions}
                        onChangeText={setDeductions}
                        keyboardType="numeric"
                    />

                    <Button
                        title={creating ? "Creating..." : "Create Payroll"}
                        onPress={createPayroll}
                        disabled={creating}
                    />
                </View>
            )}

            <View style={styles.payrollList}>
                <Text style={styles.sectionTitle}>Payroll Records ({payrolls.length})</Text>

                {payrolls.map((record) => (
                    <View key={record.id} style={styles.payrollCard}>
                        <View style={styles.payrollHeader}>
                            <View>
                                <Text style={styles.employeeName}>{record.employee_name}</Text>
                                <Text style={styles.employeeEmail}>{record.employee_email}</Text>
                            </View>
                            <View style={[
                                styles.statusBadge,
                                record.status === 'published' && styles.publishedBadge,
                            ]}>
                                <Text style={styles.statusText}>{record.status.toUpperCase()}</Text>
                            </View>
                        </View>

                        <View style={styles.payrollDetails}>
                            <Text style={styles.month}>
                                {new Date(record.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </Text>
                            <Text style={styles.amount}>Base: ${record.base_salary.toFixed(2)}</Text>
                            {record.bonuses > 0 && (
                                <Text style={styles.amount}>Bonuses: +${record.bonuses.toFixed(2)}</Text>
                            )}
                            {record.deductions > 0 && (
                                <Text style={styles.amount}>Deductions: -${record.deductions.toFixed(2)}</Text>
                            )}
                            <Text style={styles.netAmount}>Net: ${record.net_salary.toFixed(2)}</Text>
                        </View>

                        {record.status === 'draft' && (
                            <Button
                                title="Publish"
                                onPress={() => publishPayroll(record.id)}
                                color="#4caf50"
                            />
                        )}
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
    createForm: {
        backgroundColor: 'white',
        margin: 16,
        padding: 16,
        borderRadius: 8,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    payrollList: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    payrollCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    payrollHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
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
    statusBadge: {
        backgroundColor: '#fff3e0',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        height: 24,
    },
    publishedBadge: {
        backgroundColor: '#e8f5e9',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#f57c00',
    },
    payrollDetails: {
        marginBottom: 12,
    },
    month: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    amount: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    netAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2196f3',
        marginTop: 4,
    },
});
