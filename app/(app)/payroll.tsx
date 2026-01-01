import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';
import { useRouter } from 'expo-router';

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
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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
            setRefreshing(false);
        }
    }

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

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
            <View style={styles.center}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={THEME.colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.createBtn, showCreateForm && styles.cancelBtn]}
                        onPress={() => setShowCreateForm(!showCreateForm)}
                    >
                        <Ionicons
                            name={showCreateForm ? "close" : "add"}
                            size={20}
                            color="white"
                        />
                        <Text style={styles.createBtnText}>{showCreateForm ? "Cancel" : "Create"}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {showCreateForm && (
                    <ModernCard style={styles.formCard}>
                        <Text style={styles.formTitle}>New Payroll Record</Text>

                        <Text style={styles.label}>Select Employee</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.employeePicker}>
                            {employees.map((emp) => (
                                <TouchableOpacity
                                    key={emp.id}
                                    style={[
                                        styles.empTag,
                                        selectedEmployeeId === emp.id && styles.empTagSelected
                                    ]}
                                    onPress={() => setSelectedEmployeeId(emp.id)}
                                >
                                    <Text style={[
                                        styles.empTagText,
                                        selectedEmployeeId === emp.id && styles.empTagTextSelected
                                    ]}>
                                        {emp.first_name} {emp.last_name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Month (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 2024-01-01"
                            value={month}
                            onChangeText={setMonth}
                        />

                        <Text style={styles.label}>Base Salary</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            value={baseSalary}
                            onChangeText={setBaseSalary}
                            keyboardType="numeric"
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Bonuses</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    value={bonuses}
                                    onChangeText={setBonuses}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Deductions</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    value={deductions}
                                    onChangeText={setDeductions}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={createPayroll}
                            disabled={creating}
                        >
                            {creating ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                                    <Text style={styles.submitBtnText}>Create Payroll</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ModernCard>
                )}

                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>History</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{payrolls.length} Records</Text>
                    </View>
                </View>

                {payrolls.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="cash-outline" size={64} color={THEME.colors.text.muted + '40'} />
                        <Text style={styles.emptyText}>No payroll records found</Text>
                    </View>
                ) : (
                    payrolls.map((record) => (
                        <ModernCard key={record.id} style={styles.payrollCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.userInfo}>
                                    <View style={styles.avatarMini}>
                                        <Text style={styles.avatarTextMini}>
                                            {record.employee_name ? record.employee_name[0] : 'U'}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.employeeName}>{record.employee_name}</Text>
                                        <Text style={styles.employeeEmail}>{record.employee_email}</Text>
                                    </View>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    record.status === 'published' ? styles.publishedBadge : styles.draftBadge
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        record.status === 'published' ? styles.publishedText : styles.draftText
                                    ]}>
                                        {record.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.detailsGrid}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Period</Text>
                                    <Text style={styles.detailValue}>
                                        {new Date(record.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Net Salary</Text>
                                    <Text style={[styles.detailValue, { color: THEME.colors.primary, fontWeight: 'bold' }]}>
                                        ${record.net_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.breakdown}>
                                <Text style={styles.breakdownText}>
                                    Base: ${record.base_salary.toLocaleString()} •
                                    Bonuses: ${record.bonuses.toLocaleString()} •
                                    Deductions: ${record.deductions.toLocaleString()}
                                </Text>
                            </View>

                            {record.status === 'draft' && (
                                <TouchableOpacity
                                    style={styles.publishBtn}
                                    onPress={() => publishPayroll(record.id)}
                                >
                                    <Ionicons name="paper-plane-outline" size={18} color="white" />
                                    <Text style={styles.publishBtnText}>Publish to Employee</Text>
                                </TouchableOpacity>
                            )}
                        </ModernCard>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: THEME.spacing.lg, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: THEME.colors.border },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    title: { fontSize: 24, fontWeight: 'bold', color: THEME.colors.text.primary, marginLeft: 8, flex: 1 },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6
    },
    cancelBtn: { backgroundColor: THEME.colors.error },
    createBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    content: { flex: 1 },
    scrollContent: { padding: THEME.spacing.lg },
    formCard: { padding: 20, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: THEME.colors.primary },
    formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: THEME.colors.text.primary },
    label: { fontSize: 13, fontWeight: '600', color: THEME.colors.text.secondary, marginBottom: 8, marginTop: 12 },
    input: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: THEME.colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: THEME.colors.text.primary
    },
    row: { flexDirection: 'row' },
    employeePicker: { marginBottom: 8 },
    empTag: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F0F2F5',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    empTagSelected: { backgroundColor: THEME.colors.primary + '15', borderColor: THEME.colors.primary },
    empTagText: { fontSize: 13, color: THEME.colors.text.secondary },
    empTagTextSelected: { color: THEME.colors.primary, fontWeight: 'bold' },
    submitBtn: {
        backgroundColor: THEME.colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        gap: 8
    },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.colors.text.primary },
    countBadge: { backgroundColor: THEME.colors.primary + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    countText: { fontSize: 12, color: THEME.colors.primary, fontWeight: '700' },
    payrollCard: { padding: 16, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatarMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
    avatarTextMini: { color: THEME.colors.primary, fontWeight: 'bold', fontSize: 16 },
    employeeName: { fontSize: 16, fontWeight: 'bold', color: THEME.colors.text.primary },
    employeeEmail: { fontSize: 12, color: THEME.colors.text.muted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    draftBadge: { backgroundColor: '#FFF3E0' },
    draftText: { color: '#E65100' },
    publishedBadge: { backgroundColor: THEME.colors.success + '15' },
    publishedText: { color: THEME.colors.success },
    divider: { height: 1, backgroundColor: THEME.colors.border, marginVertical: 16 },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    detailItem: { gap: 4 },
    detailLabel: { fontSize: 11, color: THEME.colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 15, color: THEME.colors.text.primary, fontWeight: '500' },
    breakdown: { marginTop: 12, backgroundColor: '#F8F9FA', padding: 8, borderRadius: 8 },
    breakdownText: { fontSize: 11, color: THEME.colors.text.secondary, textAlign: 'center' },
    publishBtn: {
        backgroundColor: THEME.colors.success,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginTop: 16,
        gap: 8
    },
    publishBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 16 },
    emptyText: { fontSize: 16, color: THEME.colors.text.muted }
});
