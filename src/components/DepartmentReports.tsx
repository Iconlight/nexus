import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity, Modal, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/Theme';
import { ModernCard } from './ModernCard';

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
    const [currentReport, setCurrentReport] = useState<Report | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (teamId) {
            loadReports();
        }
    }, [teamId]);

    async function loadReports() {
        if (!teamId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('department_reports')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (error: any) {
            console.error('Error loading reports:', error.message);
        } finally {
            setLoading(false);
        }
    }

    function openNewReport() {
        setCurrentReport(null);
        setTitle('');
        setContent('');
        setModalVisible(true);
    }

    function openReport(report: Report) {
        setCurrentReport(report);
        setTitle(report.title);
        setContent(report.content);
        setModalVisible(true);
    }

    async function saveReport(status: 'draft' | 'submitted') {
        if (!title || !content || !teamId) {
            Alert.alert('Error', 'Please provide both title and content');
            return;
        }

        setCreating(true);
        try {
            const userProfile = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
            const companyId = userProfile.data?.company_id;

            if (currentReport) {
                // Update existing
                const { error } = await supabase
                    .from('department_reports')
                    .update({ title, content, status })
                    .eq('id', currentReport.id);
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('department_reports')
                    .insert({
                        company_id: companyId,
                        team_id: teamId,
                        author_id: user?.id,
                        title,
                        content,
                        status
                    });
                if (error) throw error;
            }

            Alert.alert('Success', `Report ${status === 'draft' ? 'saved as draft' : 'submitted'}`);
            setModalVisible(false);
            loadReports();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setCreating(false);
        }
    }

    const isReadOnly = currentReport?.status === 'submitted';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Team Reports</Text>
                <TouchableOpacity style={styles.newReportBtn} onPress={openNewReport}>
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.newReportBtnText}>New Report</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={THEME.colors.primary} />
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {reports.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={64} color={THEME.colors.text.muted + '40'} />
                            <Text style={styles.emptyText}>No reports documented yet.</Text>
                        </View>
                    ) : (
                        reports.map(report => (
                            <TouchableOpacity key={report.id} activeOpacity={0.8} onPress={() => openReport(report)}>
                                <ModernCard style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle} numberOfLines={1}>{report.title}</Text>
                                        <View style={[
                                            styles.badge,
                                            { backgroundColor: report.status === 'submitted' ? THEME.colors.success + '15' : THEME.colors.warning + '15' }
                                        ]}>
                                            <Text style={[
                                                styles.badgeText,
                                                { color: report.status === 'submitted' ? THEME.colors.success : THEME.colors.warning }
                                            ]}>
                                                {report.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.dateRow}>
                                        <Ionicons name="calendar-outline" size={14} color={THEME.colors.text.muted} />
                                        <Text style={styles.date}>{new Date(report.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={styles.preview} numberOfLines={2}>{report.content}</Text>
                                    <View style={styles.cardFooter}>
                                        <Text style={styles.readMore}>View Details</Text>
                                        <Ionicons name="arrow-forward" size={14} color={THEME.colors.primary} />
                                    </View>
                                </ModernCard>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}

            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalBg}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>
                                    {currentReport ? (isReadOnly ? 'View Report' : 'Edit Report') : 'New Report'}
                                </Text>
                                <Text style={styles.modalSubtitle}>Department internal documentation</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={THEME.colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Report Title</Text>
                            <TextInput
                                style={[styles.input, isReadOnly && styles.readOnlyInput]}
                                placeholder="Enter a descriptive title"
                                value={title}
                                onChangeText={setTitle}
                                editable={!isReadOnly}
                            />

                            <Text style={styles.label}>Report Content</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, isReadOnly && styles.readOnlyInput]}
                                placeholder="Write your report content here..."
                                value={content}
                                onChangeText={setContent}
                                multiline
                                editable={!isReadOnly}
                            />

                            {!isReadOnly && (
                                <View style={styles.buttonRow}>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.draftBtn]}
                                        onPress={() => saveReport('draft')}
                                        disabled={creating}
                                    >
                                        <Text style={styles.draftBtnText}>{creating ? "..." : "Save Draft"}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.submitBtn]}
                                        onPress={() => saveReport('submitted')}
                                        disabled={creating}
                                    >
                                        <Text style={styles.submitBtnText}>{creating ? "Submitting..." : "Submit Final"}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {isReadOnly && (
                                <View style={styles.submittedIndicator}>
                                    <Ionicons name="checkmark-done-circle" size={20} color={THEME.colors.success} />
                                    <Text style={styles.submittedText}>This report was submitted and is now read-only.</Text>
                                </View>
                            )}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.background },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', color: THEME.colors.text.primary },
    newReportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4
    },
    newReportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    list: { padding: 20, paddingTop: 0 },
    emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { color: THEME.colors.text.muted, fontSize: 15 },
    card: { padding: 16, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: THEME.colors.text.primary, flex: 1, marginRight: 10 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    date: { fontSize: 12, color: THEME.colors.text.muted },
    preview: { fontSize: 14, color: THEME.colors.text.secondary, lineHeight: 20 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 16, gap: 4 },
    readMore: { fontSize: 12, color: THEME.colors.primary, fontWeight: 'bold' },
    modalBg: { flex: 1, backgroundColor: 'white' },
    modalContainer: { flex: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 0 : 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: THEME.colors.text.primary },
    modalSubtitle: { fontSize: 13, color: THEME.colors.text.muted, marginTop: 4 },
    closeBtn: { padding: 8, backgroundColor: '#f5f5f5', borderRadius: 12 },
    formContent: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: THEME.colors.text.secondary, marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, fontSize: 16, color: THEME.colors.text.primary, borderWidth: 1, borderColor: THEME.colors.border },
    readOnlyInput: { backgroundColor: '#fcfcfc', color: THEME.colors.text.secondary },
    textArea: { height: 300, textAlignVertical: 'top' },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
    modalBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    draftBtn: { backgroundColor: '#f5f5f5' },
    draftBtnText: { color: THEME.colors.text.primary, fontWeight: 'bold' },
    submitBtn: { backgroundColor: THEME.colors.primary },
    submitBtnText: { color: 'white', fontWeight: 'bold' },
    submittedIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, backgroundColor: THEME.colors.success + '10', padding: 16, borderRadius: 12 },
    submittedText: { fontSize: 13, color: THEME.colors.success, fontWeight: '500' }
});
