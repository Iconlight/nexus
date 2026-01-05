import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { supabase } from '../services/supabase';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/Theme';
import { ModernCard } from './ModernCard';

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
    const [loadingDM, setLoadingDM] = useState(false);
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    useEffect(() => {
        if (visible && employee) {
            fetchStats();
        } else {
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
            const month = currentDate.getMonth() + 1;
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

    async function startDM() {
        if (!employee || !currentUser) return;
        setLoadingDM(true);
        try {
            const { data: existing, error: fetchError } = await supabase
                .from('chat_channels')
                .select('id')
                .eq('type', 'dm')
                .or(`and(participant_a.eq.${currentUser.id},participant_b.eq.${employee.id}),and(participant_a.eq.${employee.id},participant_b.eq.${currentUser.id})`)
                .maybeSingle();

            if (fetchError) throw fetchError;
            if (existing) {
                onClose();
                router.push(`/(app)/chat/${existing.id}`);
                return;
            }

            const [pA, pB] = [currentUser.id, employee.id].sort();
            const { data: newChannel, error: createError } = await supabase
                .from('chat_channels')
                .insert({
                    name: `DM: ${currentUser.id} - ${employee.id}`,
                    type: 'dm',
                    participant_a: pA,
                    participant_b: pB
                })
                .select('id')
                .single();

            if (createError) throw createError;
            onClose();
            router.push(`/(app)/chat/${newChannel.id}`);
        } catch (err) {
            console.error('Error starting DM:', err);
        } finally {
            setLoadingDM(false);
        }
    }

    if (!employee) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            presentationStyle="overFullScreen"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.headerInfo}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarTextLarge}>{employee.first_name[0]}</Text>
                            </View>
                            <View>
                                <Text style={styles.name}>{employee.first_name} {employee.last_name}</Text>
                                <Text style={styles.jobTitle}>{employee.job_title || 'No Job Title'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
                        <View style={styles.roleContainer}>
                            <View style={styles.roleBadge}>
                                <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
                                <Text style={styles.roleText}>{employee.role.toUpperCase()}</Text>
                            </View>
                            <View style={styles.deptBadge}>
                                <Ionicons name="business" size={14} color={theme.colors.text.secondary} />
                                <Text style={styles.deptText}>{employee.department || 'Unassigned'}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Contact & Profile</Text>
                            <ModernCard style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIcon}>
                                        <Ionicons name="mail-outline" size={18} color={theme.colors.text.muted} />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>Email Address</Text>
                                        <Text style={styles.infoValue}>{employee.email}</Text>
                                    </View>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIcon}>
                                        <Ionicons name="call-outline" size={18} color={theme.colors.text.muted} />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>Phone Number</Text>
                                        <Text style={styles.infoValue}>{employee.phone || 'Not provided'}</Text>
                                    </View>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIcon}>
                                        <Ionicons name="person-outline" size={18} color={theme.colors.text.muted} />
                                    </View>
                                    <View>
                                        <Text style={styles.infoLabel}>Gender</Text>
                                        <Text style={styles.infoValue}>{employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : 'Not specified'}</Text>
                                    </View>
                                </View>
                            </ModernCard>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Activity & Stats</Text>
                                <View style={styles.monthPicker}>
                                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNav}>
                                        <Ionicons name="chevron-back" size={20} color={theme.colors.text.secondary} />
                                    </TouchableOpacity>
                                    <Text style={styles.monthLabel}>
                                        {currentDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                                    </Text>
                                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNav}>
                                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {loading ? (
                                <ActivityIndicator style={{ margin: 30 }} color={theme.colors.primary} />
                            ) : (
                                <View style={styles.statsGrid}>
                                    <View style={[styles.statItem, { backgroundColor: theme.colors.primary + '08' }]}>
                                        <Text style={[styles.statVal, { color: theme.colors.primary }]}>{stats?.attendanceRate ?? 0}%</Text>
                                        <Text style={styles.statLab}>Attendance</Text>
                                    </View>
                                    <View style={[styles.statItem, { backgroundColor: theme.colors.success + '08' }]}>
                                        <Text style={[styles.statVal, { color: theme.colors.success }]}>{stats?.daysPresent ?? 0}</Text>
                                        <Text style={styles.statLab}>Present</Text>
                                    </View>
                                    <View style={[styles.statItem, { backgroundColor: theme.colors.error + '08' }]}>
                                        <Text style={[styles.statVal, { color: theme.colors.error }]}>{stats?.daysAbsent ?? 0}</Text>
                                        <Text style={styles.statLab}>Absent</Text>
                                    </View>
                                    <View style={[styles.statItem, { backgroundColor: theme.colors.warning + '08' }]}>
                                        <Text style={[styles.statVal, { color: theme.colors.warning }]}>{stats?.leavesUsed ?? 0}</Text>
                                        <Text style={styles.statLab}>Leaves</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View style={styles.actions}>
                            {(employee.role !== 'ceo') && employee.id !== currentUser?.id && (
                                <TouchableOpacity
                                    style={[styles.msgBtn, loadingDM && { opacity: 0.7 }]}
                                    onPress={startDM}
                                    disabled={loadingDM}
                                >
                                    {loadingDM ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                                            <Text style={styles.msgBtnText}>Message {employee.first_name}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
                                <Text style={styles.closeActionText}>Back to List</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarLarge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarTextLarge: {
        color: theme.colors.primary,
        fontSize: 28,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    jobTitle: {
        fontSize: 14,
        color: theme.colors.text.muted,
        marginTop: 2,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 12,
    },
    scrollArea: {
        flex: 1,
        paddingHorizontal: 24,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary + '08',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        borderWidth: 1,
        borderColor: theme.colors.primary + '20',
    },
    roleText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 11,
    },
    deptBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    deptText: {
        color: theme.colors.text.secondary,
        fontWeight: '600',
        fontSize: 11,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 16,
    },
    infoCard: {
        padding: 4,
        backgroundColor: theme.colors.card,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 11,
        color: theme.colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 15,
        color: theme.colors.text.primary,
        fontWeight: '600',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: 16,
    },
    monthPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        padding: 4,
    },
    monthNav: {
        padding: 4,
    },
    monthLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginHorizontal: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statItem: {
        flex: 1,
        minWidth: '45%',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
    },
    statVal: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLab: {
        fontSize: 11,
        color: theme.colors.text.secondary,
        fontWeight: '600',
        marginTop: 4,
    },
    actions: {
        gap: 12,
        marginTop: 8,
    },
    msgBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 20,
        gap: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    msgBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    closeActionBtn: {
        padding: 16,
        alignItems: 'center',
    },
    closeActionText: {
        color: theme.colors.text.muted,
        fontWeight: '600',
        fontSize: 15,
    },
});
