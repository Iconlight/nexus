import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';

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
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', user?.id)
        .order('created_at', { ascending: false });

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
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });

      if (!result.canceled && result.assets[0]) {
        setDocument(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  }

  async function submitRequest() {
    if (!startDate || !endDate || !reason) {
      const msg = 'Please fill in all required fields';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setSubmitting(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Company not found');
      }

      let documentUrl = null;
      if (document) {
        documentUrl = 'pending_upload';
      }

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: user?.id,
          company_id: profile.company_id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
          document_url: documentUrl,
          status: 'pending',
        });

      if (error) throw error;

      const msg = 'Leave request submitted successfully!';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
      
      setStartDate('');
      setEndDate('');
      setReason('');
      setDocument(null);
      setShowForm(false);
      
      loadRequests();
    } catch (error: any) {
      const msg = error.message || 'Failed to submit request';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leave Management</Text>
        <Button
          title={showForm ? "Cancel" : "Request Leave"}
          onPress={() => setShowForm(!showForm)}
        />
      </View>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>New Leave Request</Text>
          
          <Text style={styles.label}>Leave Type:</Text>
          <View style={styles.typeButtons}>
            {['sick', 'vacation', 'casual', 'unpaid'].map((type) => (
              <Button
                key={type}
                title={type.charAt(0).toUpperCase() + type.slice(1)}
                onPress={() => setLeaveType(type)}
                color={leaveType === type ? '#2196f3' : '#999'}
              />
            ))}
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Start Date (YYYY-MM-DD) *"
            value={startDate}
            onChangeText={setStartDate}
          />
          
          <TextInput
            style={styles.input}
            placeholder="End Date (YYYY-MM-DD) *"
            value={endDate}
            onChangeText={setEndDate}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Reason *"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
          />
          
          {leaveType === 'sick' && (
            <View style={styles.documentSection}>
              <Text style={styles.label}>Medical Certificate:</Text>
              <Button title="Upload Document" onPress={pickDocument} />
              {document && (
                <Text style={styles.documentName}>📄 {document.name}</Text>
              )}
            </View>
          )}
          
          <Button
            title={submitting ? "Submitting..." : "Submit Request"}
            onPress={submitRequest}
            disabled={submitting}
          />
        </View>
      )}

      <View style={styles.requestsList}>
        <Text style={styles.sectionTitle}>Your Requests ({requests.length})</Text>
        
        {requests.map((req) => (
          <View key={req.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestType}>
                {req.leave_type.toUpperCase()}
              </Text>
              <View style={[
                styles.statusBadge,
                req.status === 'approved' && styles.approvedBadge,
                req.status === 'rejected' && styles.rejectedBadge,
              ]}>
                <Text style={styles.statusText}>{req.status}</Text>
              </View>
            </View>
            <Text style={styles.requestDates}>
              {req.start_date} to {req.end_date}
            </Text>
            <Text style={styles.requestReason}>{req.reason}</Text>
            <Text style={styles.requestDate}>
              Submitted: {new Date(req.created_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  form: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  documentSection: {
    marginBottom: 16,
  },
  documentName: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
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
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestType: {
    fontSize: 16,
    fontWeight: '600',
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
  requestDates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestReason: {
    fontSize: 14,
    marginBottom: 8,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
});
