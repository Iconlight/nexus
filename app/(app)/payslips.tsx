import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { THEME } from '../../src/constants/Theme';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '../../src/components/ModernCard';
import { useRouter } from 'expo-router';

type Payslip = {
    id: string;
    month: string;
    base_salary: number;
    bonuses: number;
    deductions: number;
    net_salary: number;
    status: string;
};

export default function Payslips() {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const router = useRouter();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadPayslips = async () => {
        try {
            const { data, error } = await supabase
                .from('payroll_records')
                .select('*')
                .eq('employee_id', user?.id)
                .eq('status', 'published')
                .order('month', { ascending: false });

            if (error) throw error;
            setPayslips(data || []);
        } catch (error) {
            console.error('Error loading payslips:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadPayslips();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadPayslips();
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <View style={styles.pageHeader}>
                    <Ionicons name="cash-outline" size={32} color={theme.colors.primary} />
                    <Text style={styles.pageTitle}>Your Payslips</Text>
                    <Text style={styles.pageSubtitle}>View and download your salary history</Text>
                </View>

                {payslips.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={64} color={theme.colors.text.muted} />
                        <Text style={styles.emptyText}>No payslips available yet</Text>
                    </View>
                ) : (
                    payslips.map((payslip) => (
                        <ModernCard key={payslip.id} style={styles.payslipCard}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={styles.monthName}>
                                        {new Date(payslip.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </Text>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>{payslip.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <View style={styles.netAmountBox}>
                                    <Text style={styles.netAmountLabel}>NET PAY</Text>
                                    <Text style={styles.netAmountValue}>${payslip.net_salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                </View>
                            </View>

                            <View style={styles.detailsGrid}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Base Salary</Text>
                                    <Text style={styles.detailValue}>${payslip.base_salary.toLocaleString()}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Bonuses</Text>
                                    <Text style={[styles.detailValue, { color: theme.colors.success }]}>+${payslip.bonuses.toLocaleString()}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Deductions</Text>
                                    <Text style={[styles.detailValue, { color: theme.colors.error }]}>-${payslip.deductions.toLocaleString()}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.downloadBtn}
                                onPress={() => alert('PDF report generation coming soon!')}
                            >
                                <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                                <Text style={styles.downloadBtnText}>Download Statement</Text>
                            </TouchableOpacity>
                        </ModernCard>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    header: { padding: theme.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { padding: 8, marginLeft: -8 },
    refreshBtn: { padding: 8, marginRight: -8 },
    scrollContent: { padding: theme.spacing.lg },
    pageHeader: { marginBottom: 32, alignItems: 'center' },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary, marginTop: 12 },
    pageSubtitle: { fontSize: 14, color: theme.colors.text.secondary, marginTop: 4 },
    emptyState: { alignItems: 'center', marginTop: 60, gap: 16 },
    emptyText: { fontSize: 16, color: theme.colors.text.muted },
    payslipCard: { padding: 20, marginBottom: 16, backgroundColor: theme.colors.card },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    monthName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 6 },
    statusBadge: { backgroundColor: theme.colors.success + '15', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold', color: theme.colors.success },
    netAmountBox: { alignItems: 'flex-end' },
    netAmountLabel: { fontSize: 10, fontWeight: 'bold', color: theme.colors.text.muted, letterSpacing: 1 },
    netAmountValue: { fontSize: 20, fontWeight: '900', color: theme.colors.text.primary, marginTop: 4 },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    detailItem: { gap: 4 },
    detailLabel: { fontSize: 11, color: theme.colors.text.muted },
    detailValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary },
    downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 },
    downloadBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 }
});
