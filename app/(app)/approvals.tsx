import { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Alert, Platform, TextInput } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';

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
    // Joined data
    employee_name?: string;
    employee_email?: string;
};

export default function Approvals() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'all'>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, [filter]);

    async function loadRequests() {
        try {
            // Get current user's profile to check role and company
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id, role')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) return;

            // Build query based on filter
            let query = supabase
                .from('leave_requests')
                .select(`
          *,
          profiles!leave_requests_employee_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false });

            if (filter === 'pending') {
                query = query.eq('status', 'pending');
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transform data to include employee name
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
        }
    }

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

            const msg = 'Leave request approved successfully';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            loadRequests();
        } catch (error: any) {
            const msg = error.message || 'Failed to approve request';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(requestId: string) {
        // Simple rejection for now - could add a modal for rejection reason
        if (Platform.OS === 'web') {
            const reason = prompt('Rejection reason (optional):');
            await processRejection(requestId, reason || '');
        } else {
            Alert.prompt(
                'Reject Leave Request',
                'Enter rejection reason (optional):',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Reject',
                        onPress: (reason) => processRejection(requestId, reason || ''),
                    },
                ],
                'plain-text'
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

            const msg = 'Leave request rejected';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

            loadRequests();
        } catch (error: any) {
            const msg = error.message || 'Failed to reject request';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setProcessingId(null);
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading leave requests...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Leave Approvals</Text>
            </View>

            <View style={styles.filterContainer}>
                <Button
                    title="Pending"
                    onPress={() => setFilter('pending')}
                    color={filter === 'pending' ? '#2196f3' : '#999'}
                />
                <Button
                    title="All Requests"
                    onPress={() => setFilter('all')}
                    color={filter === 'all' ? '#2196f3' : '#999'}
                />
            </View>

            {requests.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                        {filter === 'pending'
                            ? 'No pending leave requests'
                            : 'No leave requests found'}
                    </Text>
                </View>
            ) : (
                <View style={styles.requestsList}>
                    <Text style={styles.sectionTitle}>
                        {filter === 'pending' ? 'Pending Requests' : 'All Requests'} ({requests.length})
                    </Text>

                    {requests.map((req) => (
                        <View key={req.id} style={styles.requestCard}>
                            <View style={styles.requestHeader}>
                                <View>
                                    <Text style={styles.employeeName}>{req.employee_name}</Text>
                                    <Text style={styles.employeeEmail}>{req.employee_email}</Text>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    req.status === 'approved' && styles.approvedBadge,
                                    req.status === 'rejected' && styles.rejectedBadge,
                                ]}>
                                    <Text style={styles.statusText}>{req.status.toUpperCase()}</Text>
                                </View>
                            </View>

                            <View style={styles.requestDetails}>
                                <Text style={styles.leaveType}>
                                    {req.leave_type.toUpperCase()} LEAVE
                                </Text>
                                <Text style={styles.dates}>
                                    {req.start_date} to {req.end_date}
                                </Text>
                                <Text style={styles.reason}>Reason: {req.reason}</Text>
                                <Text style={styles.submittedDate}>
                                    Submitted: {new Date(req.created_at).toLocaleDateString()}
                                </Text>

                                {req.rejection_reason && (
                                    <Text style={styles.rejectionReason}>
                                        Rejection reason: {req.rejection_reason}
                                    </Text>
                                )}
                            </View>

                            {req.status === 'pending' && (
                                <View style={styles.actions}>
                                    <View style={styles.actionButton}>
                                        <Button
                                            title={processingId === req.id ? "Processing..." : "Approve"}
                                            onPress={() => handleApprove(req.id)}
                                            disabled={processingId === req.id}
                                            color="#4caf50"
                                        />
                                    </View>
                                    <View style={styles.actionButton}>
                                        <Button
                                            title={processingId === req.id ? "Processing..." : "Reject"}
                                            onPress={() => handleReject(req.id)}
                                            disabled={processingId === req.id}
                                            color="#f44336"
                                        />
                                    </View>
                                </View>
                            )}
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
    filterContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    requestsList: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    requestCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
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
    },
    approvedBadge: {
        backgroundColor: '#e8f5e9',
    },
    rejectedBadge: {
        backgroundColor: '#ffebee',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#f57c00',
    },
    requestDetails: {
        marginBottom: 12,
    },
    leaveType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2196f3',
        marginBottom: 4,
    },
    dates: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    reason: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
    },
    submittedDate: {
        fontSize: 12,
        color: '#999',
    },
    rejectionReason: {
        fontSize: 13,
        color: '#f44336',
        marginTop: 8,
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
    },
});
