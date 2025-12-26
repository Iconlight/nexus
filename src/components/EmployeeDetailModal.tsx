import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Button, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';

type EmployeeDetails = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    job_title?: string;
    department?: string;
    gender?: string;
    base_salary?: number;
    phone?: string;
    stats?: {
        daysPresent: number;
        daysAbsent: number;
        leavesUsed: number;
        leavesAllowed: number;
        attendanceRate: number;
        baseSalary?: number;
    };
};

type EmployeeDetailModalProps = {
    visible: boolean;
    onClose: () => void;
    employee: EmployeeDetails | null;
    loadingStats?: boolean;
};

export default function EmployeeDetailModal({ visible, onClose, employee }: EmployeeDetailModalProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState<EmployeeDetails['stats'] | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && employee) {
            fetchStats();
        } else {
            // Reset to current month when closing/opening
            setCurrentDate(new Date());
            setStats(null);
        }
    }, [visible, employee]);

    useEffect(() => {
        if (visible && employee) {
            fetchStats();
        }
    }, [currentDate]);

    async function fetchStats() {
        if (!employee) return;

        setLoading(true);
        try {
            const month = currentDate.getMonth() + 1; // 1-12
            const year = currentDate.getFullYear();

            const { data, error } = await supabase.rpc('get_monthly_employee_stats', {
                p_employee_id: employee.id,
                p_month: month,
                p_year: year
            });

            if (error) throw error;
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    }

    function changeMonth(increment: number) {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setCurrentDate(newDate);
    }

    if (!employee) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.name}>{employee.first_name} {employee.last_name}</Text>
                                <Text style={styles.jobTitle}>{employee.job_title || 'No Job Title'}</Text>
                            </View>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{employee.role.toUpperCase()}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Personal Information</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Email:</Text>
                                <Text style={styles.value}>{employee.email}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Phone:</Text>
                                <Text style={styles.value}>{employee.phone || 'N/A'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Gender:</Text>
                                <Text style={styles.value}>{employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : 'N/A'}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Employment Details</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Department:</Text>
                                <Text style={styles.value}>{employee.department || 'Unassigned'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Base Salary:</Text>
                                <Text style={styles.value}>
                                    {stats?.baseSalary
                                        ? `$${stats.baseSalary.toLocaleString()}`
                                        : (employee.base_salary ? `$${employee.base_salary.toLocaleString()}` : 'N/A')}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Performance & Attendance</Text>
                                <View style={styles.dateFilter}>
                                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
                                        <Text style={styles.arrowText}>{'<'}</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.dateText}>
                                        {currentDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                                    </Text>
                                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
                                        <Text style={styles.arrowText}>{'>'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {loading ? (
                                <ActivityIndicator size="small" color="#2196f3" style={{ padding: 20 }} />
                            ) : (
                                <>
                                    <View style={styles.statsGrid}>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statValue}>{stats?.attendanceRate ?? 0}%</Text>
                                            <Text style={styles.statLabel}>Attendance Rate</Text>
                                        </View>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statValue}>{stats?.daysPresent ?? 0}</Text>
                                            <Text style={styles.statLabel}>Days Present</Text>
                                        </View>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statValue}>{stats?.daysAbsent ?? 0}</Text>
                                            <Text style={styles.statLabel}>Days Absent</Text>
                                        </View>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statValue}>{stats?.leavesUsed ?? 0} / {stats?.leavesAllowed ?? employee.stats?.leavesAllowed ?? 21}</Text>
                                            <Text style={styles.statLabel}>Leave Days Used</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        <Button title="Close" onPress={onClose} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 16,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    jobTitle: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    roleBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    roleText: {
        color: '#1976d2',
        fontWeight: '700',
        fontSize: 12,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#2196f3',
        paddingLeft: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f0f0f0',
    },
    label: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    value: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    loadingText: {
        fontStyle: 'italic',
        color: '#999',
        textAlign: 'center',
        padding: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        // flexWrap: 'wrap', // Removed wrap to keep in one row if 3 items
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
    },
    statBox: {
        width: '48%', // 2 per row
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    arrowBtn: {
        padding: 8,
    },
    arrowText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
    },
    dateText: {
        fontWeight: '600',
        marginHorizontal: 8,
        color: '#333',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2196f3',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
    },
});
