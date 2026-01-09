import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl, Linking } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';
import { useRouter } from 'expo-router';

type LeaveRequest = {
    id: string;
    employee_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    created_at: string;
    approved_by: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
    attachment_url?: string;
    employee_name?: string;
    employee_email?: string;
};

export default function Approvals() {
    const { user } = useAuth();
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'pending' | 'all'>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, [filter]);

    async function loadRequests() {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id, role, team_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            let query = supabase
                .from('leave_requests')
                .select(`
                    *,
                    profiles!leave_requests_employee_id_fkey!inner (
                        first_name,
                        last_name,
                        email,
                        team_id
                    )
                `)
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false });

            // If manager, filter by team
            if (profile.role === 'manager' && profile.team_id) {
                // We use the inner join filter
                query = query.eq('profiles.team_id', profile.team_id);
            }

            if (filter === 'pending') {
                query = query.eq('status', 'pending');
            }

            // If not manager or admin/ceo/hr, maybe shouldn't see anything? 
            // Assuming current page is protected or role check handles it.
            // But strict RLS is better. For now, trusting query.

            const { data, error } = await query;
            if (error) throw error;

            const transformedData = (data || []).map((req: any) => ({
                ...req,
                employee_name: req.profiles
                    ? `${req.profiles.first_name} ${req.profiles.last_name}`
                    : 'Unknown',
                employee_email: req.profiles?.email || '',
            }));

            setRequests(transformedData);
        } catch (error) {
            console.error('Error loading leave requests:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = () => {
        setRefreshing(true);
        loadRequests();
    };

    async function handleApprove(requestId: string) {
        setProcessingId(requestId);
        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({
                    status: 'approved',
                    approved_by: user?.id,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', requestId);

            if (error) throw error;

            if (Platform.OS === 'web') {
                alert('Leave request approved');
            } else {
                Alert.alert('Success', 'Leave request approved');
            }
            loadRequests();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to approve');
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(requestId: string) {
        if (Platform.OS === 'web') {
            const reason = prompt('Rejection reason (optional):');
            if (reason !== null) await processRejection(requestId, reason);
        } else {
            Alert.prompt(
                'Reject Request',
                'Enter rejection reason (optional):',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reject', style: 'destructive', onPress: (reason?: string) => processRejection(requestId, reason || '') },
                ]
            );
        }
    }

    async function processRejection(requestId: string, reason: string) {
        setProcessingId(requestId);
        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({
                    status: 'rejected',
                    approved_by: user?.id,
                    approved_at: new Date().toISOString(),
                    rejection_reason: reason || null,
                })
                .eq('id', requestId);

            if (error) throw error;
            loadRequests();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setProcessingId(null);
        }
    }

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
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Leave Approvals</Text>
                </View>

                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterBtn, filter === 'pending' && styles.filterBtnActive]}
                        onPress={() => setFilter('pending')}
                    >
                        <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>Pending</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                        onPress={() => setFilter('all')}
                    >
                        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>History</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                {requests.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-done-circle-outline" size={72} color={theme.colors.success + '40'} />
                        <Text style={styles.emptyText}>No {filter === 'pending' ? 'pending' : ''} requests found</Text>
                    </View>
                ) : (
                    requests.map((req) => {
                        const isExpanded = expandedId === req.id;
                        return (
                            <ModernCard key={req.id} style={styles.requestCard}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => setExpandedId(isExpanded ? null : req.id)}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={styles.userInfo}>
                                            <View style={styles.avatarMini}>
                                                <Text style={styles.avatarTextMini}>{req.employee_name ? req.employee_name[0] : 'U'}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.employeeName}>{req.employee_name}</Text>
                                                <Text style={styles.employeeEmail} numberOfLines={1}>{req.employee_email}</Text>
                                            </View>
                                        </View>
                                        <View style={[
                                            styles.statusBadge,
                                            req.status === 'approved' ? styles.approvedBadge :
                                                req.status === 'rejected' ? styles.rejectedBadge : styles.pendingBadge
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                req.status === 'approved' ? styles.approvedText :
                                                    req.status === 'rejected' ? styles.rejectedText : styles.pendingText
                                            ]}>
                                                {req.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                                    <View style={styles.detailsGroup}>
                                        <View style={styles.typeRow}>
                                            <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                                            <Text style={styles.leaveType}>{req.leave_type.toUpperCase()} LEAVE</Text>
                                        </View>
                                        <Text style={styles.dates}>
                                            {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                                        </Text>

                                        {isExpanded ? (
                                            <>
                                                <View style={styles.reasonBox}>
                                                    <Text style={styles.reasonLabel}>REASON</Text>
                                                    <Text style={styles.reasonText}>{req.reason || 'No reason provided'}</Text>
                                                </View>

                                                {req.rejection_reason && (
                                                    <View style={styles.rejectionBox}>
                                                        <Text style={styles.rejectionLabel}>REJECTION REASON</Text>
                                                        <Text style={styles.rejectionText}>{req.rejection_reason}</Text>
                                                    </View>
                                                )}

                                                {req.attachment_url && (
                                                    <TouchableOpacity
                                                        style={styles.attachmentBtn}
                                                        onPress={() => Linking.openURL(req.attachment_url!)}
                                                    >
                                                        <Ionicons name="document-attach" size={20} color={theme.colors.primary} />
                                                        <Text style={styles.attachmentBtnText}>View Attached Document</Text>
                                                    </TouchableOpacity>
                                                )}

                                                <Text style={styles.timestamp}>
                                                    Submitted on {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </>
                                        ) : (
                                            <Text style={styles.tapForMore}>Tap to show details...</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {isExpanded && req.status === 'pending' && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.rejectBtn]}
                                            onPress={() => handleReject(req.id)}
                                            disabled={processingId === req.id}
                                        >
                                            <Text style={styles.rejectBtnText}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.approveBtn]}
                                            onPress={() => handleApprove(req.id)}
                                            disabled={processingId === req.id}
                                        >
                                            {processingId === req.id ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Text style={styles.approveBtnText}>Approve</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ModernCard>
                        );
                    })
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    headerTop: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    backBtn: { padding: 4 },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary, marginLeft: 12 },
    filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
    filterBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
    filterBtnActive: { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary },
    filterText: { fontSize: 13, color: theme.colors.text.secondary, fontWeight: '600' },
    filterTextActive: { color: theme.colors.primary },
    scrollContent: { padding: 16 },
    emptyState: { alignItems: 'center', marginTop: 80, gap: 16 },
    emptyText: { fontSize: 16, color: theme.colors.text.muted, fontWeight: '500' },
    requestCard: { padding: 16, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatarMini: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
    avatarTextMini: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 18 },
    employeeName: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text.primary },
    employeeEmail: { fontSize: 12, color: theme.colors.text.muted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    pendingBadge: { backgroundColor: theme.colors.warning + '20' },
    pendingText: { color: theme.colors.warning },
    approvedBadge: { backgroundColor: theme.colors.success + '15' },
    approvedText: { color: theme.colors.success },
    rejectedBadge: { backgroundColor: theme.colors.error + '10' },
    rejectedText: { color: theme.colors.error },
    divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 16 },
    detailsGroup: { gap: 12 },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    leaveType: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary, letterSpacing: 0.5 },
    dates: { fontSize: 16, fontWeight: '700', color: theme.colors.text.primary },
    reasonBox: { backgroundColor: theme.colors.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
    reasonLabel: { fontSize: 9, fontWeight: 'bold', color: theme.colors.text.muted, marginBottom: 4 },
    reasonText: { fontSize: 13, color: theme.colors.text.secondary, lineHeight: 18 },
    rejectionBox: { backgroundColor: theme.colors.error + '10', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.error + '20' },
    rejectionLabel: { fontSize: 9, fontWeight: 'bold', color: theme.colors.error, marginBottom: 4 },
    rejectionText: { fontSize: 13, color: theme.colors.error, fontStyle: 'italic' },
    timestamp: { fontSize: 11, color: theme.colors.text.muted, marginTop: 8 },
    tapForMore: { fontSize: 12, color: theme.colors.primary, marginTop: 8, fontStyle: 'italic' },
    attachmentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary + '10',
        padding: 12,
        borderRadius: 12,
        marginTop: 8
    },
    attachmentBtnText: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    actionBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.error },
    rejectBtnText: { color: theme.colors.error, fontWeight: 'bold' },
    approveBtn: { backgroundColor: theme.colors.success },
    approveBtnText: { color: 'white', fontWeight: 'bold' }
});
