import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';
import { useRouter } from 'expo-router';

type LeaveRequest = {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
};

export default function Leave() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [leaveType, setLeaveType] = useState('sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [document, setDocument] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const { data, error } = await supabase.from('leave_requests').select('*').eq('employee_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
      if (!result.canceled && result.assets[0]) setDocument(result.assets[0]);
    } catch (error) { console.error('Error picking document:', error); }
  }

  async function submitRequest() {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
      if (!profile?.company_id) throw new Error('Company not found');

      let attachmentUrl = null;
      if (document) {
        const fileExt = document.name.split('.').pop();
        const filePath = `${user?.id}/${Date.now()}.${fileExt}`;
        let fileBody = Platform.OS === 'web' ? document.file : await (await fetch(document.uri)).blob();
        const { error: uploadError } = await supabase.storage.from('leave-documents').upload(filePath, fileBody);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('leave-documents').getPublicUrl(filePath);
        attachmentUrl = publicUrl;
      }

      const { error } = await supabase.from('leave_requests').insert({
        employee_id: user?.id,
        company_id: profile.company_id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason,
        attachment_url: attachmentUrl,
        status: 'pending',
      });

      if (error) throw error;
      Alert.alert('Success', 'Leave request submitted!');
      setStartDate(''); setEndDate(''); setReason(''); setDocument(null); setShowForm(false);
      loadRequests();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formBtn, { backgroundColor: showForm ? theme.colors.error : theme.colors.primary }]}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name={showForm ? "close" : "add"} size={22} color="white" />
          <Text style={styles.formBtnText}>{showForm ? "Cancel" : "New Request"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {showForm && (
          <ModernCard style={styles.formCard}>
            <Text style={styles.formTitle}>New Request</Text>

            <Text style={styles.label}>Select Type</Text>
            <View style={styles.typeRow}>
              {['sick', 'vacation', 'casual', 'unpaid'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, leaveType === type && styles.typeBtnActive]}
                  onPress={() => setLeaveType(type)}
                >
                  <Text style={[styles.typeBtnText, leaveType === type && styles.typeBtnTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.text.muted} value={startDate} onChangeText={setStartDate} />
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.label}>End Date</Text>
                <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.text.muted} value={endDate} onChangeText={setEndDate} />
              </View>
            </View>

            <Text style={styles.label}>Reason</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Why do you need leave?"
              placeholderTextColor={theme.colors.text.muted}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />

            {leaveType === 'sick' && (
              <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.uploadBtnText}>{document ? document.name : "Upload Certificate"}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={submitRequest} disabled={submitting}>
              {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
            </TouchableOpacity>
          </ModernCard>
        )}

        <Text style={styles.sectionTitle}>Your History</Text>
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.text.muted} />
            <Text style={styles.emptyText}>No requests yet</Text>
          </View>
        ) : (
          requests.map((req) => (
            <ModernCard key={req.id} style={styles.requestCard}>
              <View style={styles.cardTop}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{req.leave_type.toUpperCase()}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  req.status === 'approved' ? styles.statusApproved :
                    req.status === 'rejected' ? styles.statusRejected : {}
                ]}>
                  <Text style={[
                    styles.statusText,
                    req.status === 'approved' ? styles.statusTextApproved :
                      req.status === 'rejected' ? styles.statusTextRejected : {}
                  ]}>{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</Text>
                </View>
              </View>

              <Text style={styles.reqDates}>{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</Text>
              <Text style={styles.reqReason} numberOfLines={2}>{req.reason}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.footerDate}>Submitted {new Date(req.created_at).toLocaleDateString()}</Text>
                {req.status === 'pending' && <Ionicons name="time-outline" size={14} color={theme.colors.warning} />}
              </View>
            </ModernCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { padding: 8, marginLeft: -8 },
  formBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
  formBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  scrollContent: { padding: 16 },
  formCard: { padding: 20, marginBottom: 24 },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: theme.colors.text.primary },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text.secondary, marginBottom: 8, marginTop: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  typeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  typeBtnText: { fontSize: 12, color: theme.colors.text.secondary, fontWeight: '600' },
  typeBtnTextActive: { color: 'white' },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputWrap: { flex: 1 },
  input: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border, fontSize: 15, color: theme.colors.text.primary },
  textArea: { height: 80, textAlignVertical: 'top' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary, borderStyle: 'dashed', marginTop: 16, gap: 10, backgroundColor: theme.colors.primary + '10' },
  uploadBtnText: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
  submitBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: theme.colors.text.primary },
  requestCard: { padding: 16, marginBottom: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeBadge: { backgroundColor: theme.colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold', color: theme.colors.primary },
  statusBadge: { backgroundColor: theme.colors.warning + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusApproved: { backgroundColor: theme.colors.success + '20' },
  statusRejected: { backgroundColor: theme.colors.error + '20' },
  statusText: { fontSize: 10, fontWeight: '800', color: theme.colors.warning },
  statusTextApproved: { color: theme.colors.success },
  statusTextRejected: { color: theme.colors.error },
  reqDates: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 6 },
  reqReason: { fontSize: 13, color: theme.colors.text.secondary, lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  footerDate: { fontSize: 11, color: theme.colors.text.muted },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: theme.colors.text.muted, marginTop: 12 }
});
