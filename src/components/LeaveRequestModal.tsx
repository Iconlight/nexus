import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, ScrollView, Platform, SafeAreaView } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/Theme';
import { ModernCard } from './ModernCard';

type LeaveRequestModalProps = {
    visible: boolean;
    onClose: () => void;
    request: any;
    onUpdate: () => void;
};

export default function LeaveRequestModal({ visible, onClose, request, onUpdate }: LeaveRequestModalProps) {
    const { user } = useAuth();
    const [note, setNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [imageModalVisible, setImageModalVisible] = useState(false);

    if (!request) return null;

    async function handleAction(action: 'approved' | 'rejected') {
        const confirmMsg = action === 'approved'
            ? "Approve this leave request? Days will be deducted from employee balance."
            : "Reject this leave request?";

        if (Platform.OS === 'web') {
            if (!window.confirm(confirmMsg)) return;
        }

        setProcessing(true);
        try {
            const updates: any = {
                status: action,
                reviewer_note: note,
            };

            if (action === 'approved') {
                updates.approved_by = user?.id;
                updates.approved_at = new Date().toISOString();
            } else {
                updates.rejected_by = user?.id;
                updates.rejected_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('leave_requests')
                .update(updates)
                .eq('id', request.id);

            if (error) throw error;

            Alert.alert('Success', `Request ${action}`);
            onUpdate();
            onClose();
            setNote('');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setProcessing(false);
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.safe}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Request Review</Text>
                            <Text style={styles.subtitle}>Leave application details</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={THEME.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <ModernCard style={styles.mainCard}>
                            <View style={styles.userInfo}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{request.profiles?.first_name[0]}</Text>
                                </View>
                                <View>
                                    <Text style={styles.userName}>{request.profiles?.first_name} {request.profiles?.last_name}</Text>
                                    <Text style={styles.userRole}>{request.profiles?.role?.toUpperCase()}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.detailGrid}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.label}>LEAVE TYPE</Text>
                                    <View style={styles.typeBadge}>
                                        <Text style={styles.typeText}>{request.type?.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.label}>PERIOD</Text>
                                    <Text style={styles.valueText}>
                                        {new Date(request.start_date).toLocaleDateString()} — {new Date(request.end_date).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.reasonSection}>
                                <Text style={styles.label}>REASON FOR LEAVE</Text>
                                <View style={styles.reasonBox}>
                                    <Text style={styles.bodyText}>{request.reason || 'No reason specified'}</Text>
                                </View>
                            </View>

                            {request.attachment_url && (
                                <View style={styles.attachmentSection}>
                                    <Text style={styles.label}>SUPPORTING DOCUMENT</Text>
                                    <TouchableOpacity
                                        style={styles.attachmentCard}
                                        onPress={() => setImageModalVisible(true)}
                                        activeOpacity={0.9}
                                    >
                                        <Image
                                            source={{ uri: request.attachment_url }}
                                            style={styles.thumbnail}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.attachmentOverlay}>
                                            <Ionicons name="expand" size={20} color="white" />
                                            <Text style={styles.viewText}>Tap to enlarge</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ModernCard>

                        {request.status === 'pending' && (
                            <View style={styles.actionSection}>
                                <Text style={styles.label}>REVIEWER'S NOTE (OPTIONAL)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Add feedback for the employee..."
                                    value={note}
                                    onChangeText={setNote}
                                    multiline
                                />

                                <View style={styles.buttonRow}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.rejectBtn]}
                                        onPress={() => handleAction('rejected')}
                                        disabled={processing}
                                    >
                                        <Text style={styles.rejectText}>Reject</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.approveBtn]}
                                        onPress={() => handleAction('approved')}
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text style={styles.approveText}>Approve</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </SafeAreaView>

            {/* Image Viewer */}
            <Modal visible={imageModalVisible} transparent={true} animationType="fade">
                <View style={styles.imageViewerBg}>
                    <TouchableOpacity style={styles.viewerClose} onPress={() => setImageModalVisible(false)}>
                        <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: request.attachment_url }}
                        style={styles.fullImage}
                        resizeMode="contain"
                    />
                </View>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'white' },
    container: { flex: 1, backgroundColor: THEME.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, backgroundColor: 'white', borderBottomWidth: 1, borderColor: THEME.colors.border, alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', color: THEME.colors.text.primary },
    subtitle: { fontSize: 13, color: THEME.colors.text.muted, marginTop: 2 },
    closeBtn: { padding: 8, backgroundColor: '#f5f5f5', borderRadius: 12 },
    content: { flex: 1, padding: 20 },
    mainCard: { padding: 20, marginBottom: 24 },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: THEME.colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: THEME.colors.primary, fontSize: 20, fontWeight: 'bold' },
    userName: { fontSize: 18, fontWeight: 'bold', color: THEME.colors.text.primary },
    userRole: { fontSize: 11, color: THEME.colors.text.muted, marginTop: 2, letterSpacing: 1 },
    divider: { height: 1, backgroundColor: THEME.colors.border, marginVertical: 20 },
    detailGrid: { gap: 16 },
    detailItem: { gap: 8 },
    label: { fontSize: 10, fontWeight: 'bold', color: THEME.colors.text.muted, letterSpacing: 0.5 },
    typeBadge: { alignSelf: 'flex-start', backgroundColor: THEME.colors.primary + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    typeText: { fontSize: 12, color: THEME.colors.primary, fontWeight: 'bold' },
    valueText: { fontSize: 16, fontWeight: '600', color: THEME.colors.text.primary },
    reasonSection: { marginTop: 20 },
    reasonBox: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 16 },
    bodyText: { fontSize: 14, color: THEME.colors.text.secondary, lineHeight: 22 },
    attachmentSection: { marginTop: 24 },
    attachmentCard: { borderRadius: 16, overflow: 'hidden', height: 200, backgroundColor: '#eee' },
    thumbnail: { width: '100%', height: '100%' },
    attachmentOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', gap: 6 },
    viewText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    actionSection: { marginTop: 8 },
    input: { backgroundColor: 'white', borderVertical: 1, borderColor: THEME.colors.border, borderRadius: 16, padding: 16, fontSize: 15, color: THEME.colors.text.primary, minHeight: 100, textAlignVertical: 'top', marginTop: 12 },
    buttonRow: { flexDirection: 'row', gap: 16, marginTop: 24 },
    actionBtn: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    approveBtn: { backgroundColor: THEME.colors.success },
    rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: THEME.colors.error },
    approveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    rejectText: { color: THEME.colors.error, fontWeight: 'bold', fontSize: 16 },
    imageViewerBg: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: '100%', height: '85%' },
    viewerClose: { position: 'absolute', top: 50, right: 24, zIndex: 10, padding: 8 }
});
