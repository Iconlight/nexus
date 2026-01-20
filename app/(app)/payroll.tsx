import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl, Modal } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';

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
    department?: string;
};

const MONTHS = [
    { label: 'All', value: 'All' },
    { label: 'Jan', value: '01' },
    { label: 'Feb', value: '02' },
    { label: 'Mar', value: '03' },
    { label: 'Apr', value: '04' },
    { label: 'May', value: '05' },
    { label: 'Jun', value: '06' },
    { label: 'Jul', value: '07' },
    { label: 'Aug', value: '08' },
    { label: 'Sep', value: '09' },
    { label: 'Oct', value: '10' },
    { label: 'Nov', value: '11' },
    { label: 'Dec', value: '12' },
];

export default function Payroll() {
    const { user } = useAuth();
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Global Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('All');
    const [filterYear, setFilterYear] = useState('All');
    const [filterMonth, setFilterMonth] = useState('All');

    // Create Form State
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [createMonth, setCreateMonth] = useState('');
    const [baseSalary, setBaseSalary] = useState('');
    const [bonuses, setBonuses] = useState('');
    const [deductions, setDeductions] = useState('');
    const [creating, setCreating] = useState(false);
    const [publishingAll, setPublishingAll] = useState(false);

    useEffect(() => {
        loadData();
        // Set default month for creation
        const now = new Date();
        setCreateMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
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
                        email,
                        teams (
                            name
                        )
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
                department: record.profiles?.teams?.name || 'Unassigned',
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

    // --- Derived Data ---

    // 1. Available Years for Filter
    const availableYears = useMemo(() => {
        const years = new Set(payrolls.map(p => p.month.substring(0, 4)));
        const sorted = Array.from(years).sort().reverse();
        return ['All', ...sorted];
    }, [payrolls]);

    // 2. Departments for Filter
    const departments = useMemo(() => {
        const depts = new Set(payrolls.map(p => p.department || 'Unassigned'));
        const sorted = Array.from(depts).sort();
        return ['All', ...sorted];
    }, [payrolls]);

    // 3. Filtered Records (The Single Source of Truth for Stats and List)
    const filteredRecords = useMemo(() => {
        return payrolls.filter(p => {
            // Search Filter
            const matchesSearch = !searchQuery ||
                p.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.employee_email?.toLowerCase().includes(searchQuery.toLowerCase());

            // Department Filter
            const matchesDept = filterDepartment === 'All' || p.department === filterDepartment;

            // Date Filter
            const pDate = p.month; // YYYY-MM-DD
            const pYear = pDate.substring(0, 4);
            const pMonth = pDate.substring(5, 7);

            const matchesYear = filterYear === 'All' || pYear === filterYear;
            const matchesMonth = filterMonth === 'All' || pMonth === filterMonth;

            return matchesSearch && matchesDept && matchesYear && matchesMonth;
        });
    }, [payrolls, searchQuery, filterDepartment, filterYear, filterMonth]);

    // 4. Analytics (Derived from filteredRecords)
    const analytics = useMemo(() => {
        const totalPayout = filteredRecords.reduce((sum, p) => sum + (p.net_salary || 0), 0);
        const totalEmployees = new Set(filteredRecords.map(p => p.employee_id)).size;
        const draftCount = filteredRecords.filter(p => p.status === 'draft').length;

        return { totalPayout, totalEmployees, draftCount };
    }, [filteredRecords]);

    async function createPayroll() {
        if (!selectedEmployeeId || !createMonth || !baseSalary) {
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
                    month: createMonth,
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

            // Do NOT reset filters, so user sees the context they are in if pertinent
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
            loadData();
        } catch (error: any) {
            const msg = error.message || 'Failed to publish payroll';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        }
    }

    async function publishAllPayrolls() {
        if (analytics.draftCount === 0) return;

        // We only allow bulk publish if a specific month is selected (safeguard)
        // OR we can publish all visible drafts. The safe bet is to ask user.
        // But the RPC is designed for a specific month.
        // So we should only enable this button if filtered to a specific month?
        // OR: We iterate and publish visible? No, use the RPC.

        // If filterMonth is 'All', we can't safely use the single-month RPC for everything.
        // Let's check distinct months in the Drafts.
        const distinctMonths = new Set(filteredRecords.filter(p => p.status === 'draft').map(p => p.month));

        if (distinctMonths.size > 1) {
            Alert.alert('Consolidate Filters', 'Please filter by a specific Month to publish all drafts at once.');
            return;
        }

        const targetMonth = Array.from(distinctMonths)[0];
        if (!targetMonth) return; // No drafts

        Alert.alert(
            'Publish All?',
            `Publish ${analytics.draftCount} draft payrolls for ${targetMonth}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Publish',
                    style: 'destructive',
                    onPress: async () => {
                        setPublishingAll(true);
                        try {
                            const { error } = await supabase.rpc('publish_all_payrolls', {
                                p_month: targetMonth
                            });

                            if (error) throw error;

                            Alert.alert('Success', 'All draft payrolls have been published.');
                            loadData();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to publish all payrolls');
                        } finally {
                            setPublishingAll(false);
                        }
                    }
                }
            ]
        );
    }

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Payroll</Text>
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

                {/* Global Search Bar */}
                {!showCreateForm && (
                    <View style={[styles.searchContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <Ionicons name="search" size={20} color={theme.colors.text.secondary} />
                        <TextInput
                            style={[styles.searchInput, { color: theme.colors.text.primary }]}
                            placeholder="Search employees..."
                            placeholderTextColor={theme.colors.text.muted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={theme.colors.text.muted} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {/* Analytics Dashboard */}
                {!showCreateForm && (
                    <ModernCard style={styles.analyticsCard}>
                        <View style={styles.analyticsHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Overview</Text>
                            {/* Filter Summary */}
                            <View style={styles.filterSummary}>
                                <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                                    {filterYear === 'All' ? 'All Time' : filterYear} • {filterMonth === 'All' ? 'All Months' : MONTHS.find(m => m.value === filterMonth)?.label}
                                </Text>
                            </View>
                        </View>

                        {/* Filters Row */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                            {/* YEAR FILTER */}
                            {availableYears.map(y => (
                                <TouchableOpacity key={y} onPress={() => setFilterYear(y)}
                                    style={[styles.filterChip, filterYear === y && styles.filterChipActive, { borderColor: theme.colors.border }]}>
                                    <Text style={[styles.filterText, filterYear === y && styles.filterTextActive, { color: filterYear === y ? 'white' : theme.colors.text.secondary }]}>{y === 'All' ? 'All Years' : y}</Text>
                                </TouchableOpacity>
                            ))}
                            {/* SEPARATOR */}
                            <View style={{ width: 1, height: 20, backgroundColor: theme.colors.border, marginHorizontal: 8, alignSelf: 'center' }} />

                            {/* MONTH FILTER */}
                            {MONTHS.map(m => (
                                <TouchableOpacity key={m.value} onPress={() => setFilterMonth(m.value)}
                                    style={[styles.filterChip, filterMonth === m.value && styles.filterChipActive, { borderColor: theme.colors.border }]}>
                                    <Text style={[styles.filterText, filterMonth === m.value && styles.filterTextActive, { color: filterMonth === m.value ? 'white' : theme.colors.text.secondary }]}>{m.label}</Text>
                                </TouchableOpacity>
                            ))}

                            {/* SEPARATOR */}
                            <View style={{ width: 1, height: 20, backgroundColor: theme.colors.border, marginHorizontal: 8, alignSelf: 'center' }} />

                            {/* DEPT FILTER */}
                            {departments.map(dept => (
                                <TouchableOpacity key={dept} onPress={() => setFilterDepartment(dept)}
                                    style={[styles.filterChip, filterDepartment === dept && styles.filterChipActive, { borderColor: theme.colors.border }]}>
                                    <Text style={[styles.filterText, filterDepartment === dept && styles.filterTextActive, { color: filterDepartment === dept ? 'white' : theme.colors.text.secondary }]}>{dept}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Total Paid</Text>
                                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                                    ${analytics.totalPayout.toLocaleString()}
                                </Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Employees</Text>
                                <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
                                    {analytics.totalEmployees}
                                </Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Pending</Text>
                                <Text style={[styles.statValue, { color: analytics.draftCount > 0 ? THEME.colors.warning : theme.colors.success }]}>
                                    {analytics.draftCount}
                                </Text>
                            </View>
                        </View>

                        {analytics.draftCount > 0 && (
                            <TouchableOpacity
                                style={styles.publishAllBtn}
                                onPress={publishAllPayrolls}
                                disabled={publishingAll}
                            >
                                {publishingAll ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="paper-plane" size={16} color="white" />
                                        <Text style={styles.publishAllText}>Publish Visible Drafts</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </ModernCard>
                )}

                {showCreateForm && (
                    <ModernCard style={styles.formCard}>
                        <Text style={[styles.formTitle, { color: theme.colors.text.primary }]}>New Payroll Record</Text>

                        <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Select Employee</Text>
                        <ScrollView
                            style={[styles.employeeList, { borderColor: theme.colors.border }]}
                            nestedScrollEnabled={true}
                        >
                            {employees.map((emp) => (
                                <TouchableOpacity
                                    key={emp.id}
                                    style={[
                                        styles.empItem,
                                        selectedEmployeeId === emp.id && { backgroundColor: theme.colors.primary + '15' }
                                    ]}
                                    onPress={() => setSelectedEmployeeId(emp.id)}
                                >
                                    <View style={[styles.avatarMini, { backgroundColor: theme.colors.primary }]}>
                                        <Text style={styles.avatarTextMini}>{emp.first_name[0]}{emp.last_name[0]}</Text>
                                    </View>
                                    <View>
                                        <Text style={[
                                            styles.empName,
                                            selectedEmployeeId === emp.id && { color: theme.colors.primary, fontWeight: 'bold' },
                                            { color: theme.colors.text.primary }
                                        ]}>
                                            {emp.first_name} {emp.last_name}
                                        </Text>
                                        <Text style={[styles.empEmail, { color: theme.colors.text.muted }]}>{emp.email}</Text>
                                    </View>
                                    {selectedEmployeeId === emp.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Month (YYYY-MM-DD)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
                            placeholder="e.g. 2024-01-01"
                            placeholderTextColor={theme.colors.text.muted}
                            value={createMonth}
                            onChangeText={setCreateMonth}
                        />

                        <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Base Salary</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.text.muted}
                            value={baseSalary}
                            onChangeText={setBaseSalary}
                            keyboardType="numeric"
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Bonuses</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.text.muted}
                                    value={bonuses}
                                    onChangeText={setBonuses}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Deductions</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text.primary }]}
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.text.muted}
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
                    <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Records</Text>
                    <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                        <Text style={[styles.countText, { color: theme.colors.primary }]}>{filteredRecords.length}</Text>
                    </View>
                </View>

                {filteredRecords.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="file-tray-outline" size={64} color={theme.colors.text.muted + '40'} />
                        <Text style={[styles.emptyText, { color: theme.colors.text.muted }]}>No matching records</Text>
                    </View>
                ) : (
                    filteredRecords.map((record) => (
                        <ModernCard key={record.id} style={styles.payrollCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.userInfo}>
                                    <View style={[styles.avatarMini, { backgroundColor: theme.colors.primary + '20' }]}>
                                        <Text style={[styles.avatarTextMini, { color: theme.colors.primary }]}>
                                            {record.employee_name ? record.employee_name[0] : 'U'}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.employeeName, { color: theme.colors.text.primary }]}>{record.employee_name}</Text>
                                        <Text style={[styles.employeeEmail, { color: theme.colors.text.muted }]}>{record.department} • {record.employee_email}</Text>
                                    </View>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    record.status === 'published' ? { backgroundColor: theme.colors.success + '15' } : { backgroundColor: '#FFF3E0' }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        record.status === 'published' ? { color: theme.colors.success } : { color: '#E65100' }
                                    ]}>
                                        {record.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                            <View style={styles.detailsGrid}>
                                <View style={styles.detailItem}>
                                    <Text style={[styles.detailLabel, { color: theme.colors.text.muted }]}>Period</Text>
                                    <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                                        {new Date(record.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={[styles.detailLabel, { color: theme.colors.text.muted }]}>Net Salary</Text>
                                    <Text style={[styles.detailValue, { color: theme.colors.primary, fontWeight: 'bold' }]}>
                                        ${record.net_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </View>

                            {record.status === 'draft' && (
                                <TouchableOpacity
                                    style={styles.publishBtn}
                                    onPress={() => publishPayroll(record.id)}
                                >
                                    <Ionicons name="paper-plane-outline" size={18} color="white" />
                                    <Text style={styles.publishBtnText}>Publish</Text>
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

const createStyles = (theme: typeof THEME, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: THEME.spacing.lg, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.primary, marginLeft: 8, flex: 1 },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6
    },
    cancelBtn: { backgroundColor: theme.colors.error },
    createBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    content: { flex: 1 },
    scrollContent: { padding: THEME.spacing.lg },

    // Analytics
    analyticsCard: { padding: 16, marginBottom: 24 },
    analyticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    filterSummary: { backgroundColor: theme.colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    filterScroll: { marginBottom: 16, flexGrow: 0 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterText: { fontSize: 12, fontWeight: '600' },
    filterTextActive: { color: 'white' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
    statItem: { alignItems: 'center', flex: 1 },
    statLabel: { fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold' },
    statDivider: { width: 1, height: 30, backgroundColor: theme.colors.border },
    publishAllBtn: {
        backgroundColor: theme.colors.success,
        marginTop: 16,
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8
    },
    publishAllText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    formCard: { padding: 20, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
    formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
    },

    // Search & List
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15 },
    employeeList: { maxHeight: 200, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
    empItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
    empName: { fontSize: 14, fontWeight: '600' },
    empEmail: { fontSize: 12 },

    row: { flexDirection: 'row' },
    submitBtn: {
        backgroundColor: theme.colors.primary,
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
    sectionTitle: { fontSize: 18, fontWeight: 'bold' },
    countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    countText: { fontSize: 12, fontWeight: '700' },
    payrollCard: { padding: 16, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatarMini: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarTextMini: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    employeeName: { fontSize: 16, fontWeight: 'bold' },
    employeeEmail: { fontSize: 12, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    divider: { height: 1, marginVertical: 16 },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    detailItem: { gap: 4 },
    detailLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 15, fontWeight: '500' },
    publishBtn: {
        backgroundColor: theme.colors.success,
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
    emptyText: { fontSize: 16 }
});
