import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Button, Alert, TouchableOpacity, Modal } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type Report = {
    id: string;
    title: string;
    content: string;
    status: 'draft' | 'submitted';
    created_at: string;
};

type DepartmentReportsProps = {
    teamId: string;
};

export default function DepartmentReports({ teamId }: DepartmentReportsProps) {
    const { user } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (teamId) {
            loadReports();
        }
    }, [teamId]);

    async function loadReports() {
        try {
            const { data, error } = await supabase
                .from('department_reports')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);

        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    }

    async function saveReport(status: 'draft' | 'submitted') {
        if (!title || !content || !teamId) return;

        setCreating(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) throw new Error('Company not found');

            const { error } = await supabase
                .from('department_reports')
                .insert({
                    company_id: profile.company_id,
                    team_id: teamId,
                    author_id: user?.id,
                    title,
                    content,
                    status
                });

            if (error) throw error;

            Alert.alert('Success', `Report ${status === 'draft' ? 'saved as draft' : 'submitted'}`);
            setModalVisible(false);
            setTitle('');
            setContent('');
            loadReports();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setCreating(false);
        }
    }

    function getStatusColor(status: string) {
        return status === 'submitted' ? '#4caf50' : '#ff9800';
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Department Reports</Text>
                <Button title="New Report" onPress={() => setModalVisible(true)} />
            </View>

            <ScrollView style={styles.list}>
                {reports.length === 0 ? (
                    <Text style={styles.emptyText}>No reports found.</Text>
                ) : (
                    reports.map(report => (
                        <View key={report.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{report.title}</Text>
                                <View style={[styles.badge, { backgroundColor: getStatusColor(report.status) }]}>
                                    <Text style={styles.badgeText}>{report.status.toUpperCase()}</Text>
                                </View>
                            </View>
                            <Text style={styles.date}>{new Date(report.created_at).toLocaleDateString()}</Text>
                            <Text style={styles.preview} numberOfLines={2}>{report.content}</Text>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Report</Text>
                        <Button title="Cancel" onPress={() => setModalVisible(false)} />
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Report Title"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Write your report content here..."
                        value={content}
                        onChangeText={setContent}
                        multiline
                    />

                    <View style={styles.buttonRow}>
                        <Button
                            title={creating ? "Saving..." : "Save Draft"}
                            onPress={() => saveReport('draft')}
                            disabled={creating}
                            color="#ff9800"
                        />
                        <View style={{ width: 16 }} />
                        <Button
                            title={creating ? "Submitting..." : "Submit Report"}
                            onPress={() => saveReport('submitted')}
                            disabled={creating}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        padding: 16,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#999',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginBottom: 8,
    },
    preview: {
        color: '#444',
    },
    modalContainer: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 16,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    textArea: {
        height: 200,
        textAlignVertical: 'top',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
});
