import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';

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
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayslips();
    }, []);

    async function loadPayslips() {
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
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading payslips...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Payslips</Text>
            </View>

            {payslips.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No payslips available yet</Text>
                </View>
            ) : (
                <View style={styles.payslipsList}>
                    {payslips.map((payslip) => (
                        <View key={payslip.id} style={styles.payslipCard}>
                            <View style={styles.payslipHeader}>
                                <Text style={styles.month}>
                                    {new Date(payslip.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </Text>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{payslip.status}</Text>
                                </View>
                            </View>

                            <View style={styles.payslipDetails}>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Base Salary:</Text>
                                    <Text style={styles.value}>${payslip.base_salary.toFixed(2)}</Text>
                                </View>

                                {payslip.bonuses > 0 && (
                                    <View style={styles.row}>
                                        <Text style={styles.label}>Bonuses:</Text>
                                        <Text style={[styles.value, styles.positive]}>+${payslip.bonuses.toFixed(2)}</Text>
                                    </View>
                                )}

                                {payslip.deductions > 0 && (
                                    <View style={styles.row}>
                                        <Text style={styles.label}>Deductions:</Text>
                                        <Text style={[styles.value, styles.negative]}>-${payslip.deductions.toFixed(2)}</Text>
                                    </View>
                                )}

                                <View style={[styles.row, styles.totalRow]}>
                                    <Text style={styles.totalLabel}>Net Salary:</Text>
                                    <Text style={styles.totalValue}>${payslip.net_salary.toFixed(2)}</Text>
                                </View>
                            </View>

                            <Button title="Download PDF" onPress={() => alert('PDF download coming soon')} />
                        </View>
                    ))}
                </View>
            )}
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
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    payslipsList: {
        padding: 16,
    },
    payslipCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    payslipHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    month: {
        fontSize: 18,
        fontWeight: '600',
    },
    statusBadge: {
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4caf50',
    },
    payslipDetails: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#666',
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
    },
    positive: {
        color: '#4caf50',
    },
    negative: {
        color: '#f44336',
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2196f3',
    },
});
