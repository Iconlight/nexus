import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../../src/constants/Theme';

type Message = {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    status?: 'sending' | 'sent' | 'error';
    profiles?: {
        first_name: string;
        last_name: string;
    };
};

export default function ChatRoom() {
    const { id: channelId } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [channelName, setChannelName] = useState('Chat');

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!channelId) return;
        fetchChannelInfo();
        fetchMessages();

        const channel = supabase.channel(`room:${channelId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
                fetchNewMessage(payload.new.id);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [channelId]);

    async function fetchChannelInfo() {
        const { data } = await supabase.from('chat_channels').select('*, profiles_a(first_name, last_name), profiles_b(first_name, last_name)').eq('id', channelId).single();
        if (data) {
            if (data.type === 'dm') {
                const partner = data.participant_a === user?.id ? data.profiles_b : data.profiles_a;
                setChannelName(partner ? `${partner.first_name} ${partner.last_name}` : 'Direct Message');
            } else {
                setChannelName(data.name);
            }
        }
    }

    async function fetchMessages() {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*, profiles(first_name, last_name)')
                .eq('channel_id', channelId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchNewMessage(messageId: string) {
        const { data } = await supabase.from('chat_messages').select('*, profiles(first_name, last_name)').eq('id', messageId).single();
        if (data) {
            setMessages(prev => {
                const optimisticIdx = prev.findIndex(m => m.status === 'sending' && m.content === data.content && m.sender_id === data.sender_id);
                if (optimisticIdx !== -1) {
                    const newMsgs = [...prev];
                    newMsgs[optimisticIdx] = { ...data, status: 'sent' };
                    return newMsgs;
                }
                if (prev.find(m => m.id === data.id)) return prev;
                return [...prev, { ...data, status: 'sent' }];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }

    async function sendMessage() {
        const text = inputText.trim();
        if (!text) return;

        const tempId = `optimistic-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticMsg: Message = { id: tempId, content: text, sender_id: user?.id || '', created_at: new Date().toISOString(), status: 'sending' };

        setMessages(prev => [...prev, optimisticMsg]);
        setInputText('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            const { error } = await supabase.from('chat_messages').insert({ channel_id: channelId, sender_id: user?.id, content: text });
            if (error) throw error;
        } catch (error) {
            console.error('Send error:', error);
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
        }
    }

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender_id === user?.id;
        const name = item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : 'You';

        return (
            <View style={[styles.bubbleWrapper, isMe ? styles.myWrapper : styles.otherWrapper]}>
                {!isMe && <Text style={styles.senderName}>{name}</Text>}
                <View style={[
                    styles.bubble,
                    isMe ? styles.myBubble : styles.otherBubble,
                    item.status === 'sending' && { opacity: 0.7 }
                ]}>
                    <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && item.status === 'sending' && " • Sending..."}
                        {isMe && item.status === 'error' && " • Failed"}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={THEME.colors.text.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{channelName}</Text>
                        <View style={styles.onlineStatus}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>Active now</Text>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.center}><ActivityIndicator color={THEME.colors.primary} /></View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />
                )}

                <View style={styles.inputContainer}>
                    <View style={styles.inputInner}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Message..."
                            placeholderTextColor={THEME.colors.text.muted}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={!inputText.trim()}
                            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
                        >
                            <View style={styles.sendIconBg}>
                                <Ionicons name="arrow-up" size={20} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.colors.border, backgroundColor: 'white' },
    backBtn: { padding: 4 },
    headerInfo: { marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.colors.text.primary },
    onlineStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.success, marginRight: 6 },
    statusText: { fontSize: 12, color: THEME.colors.text.secondary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 24 },
    bubbleWrapper: { marginBottom: 16, maxWidth: '85%' },
    myWrapper: { alignSelf: 'flex-end' },
    otherWrapper: { alignSelf: 'flex-start' },
    senderName: { fontSize: 12, fontWeight: '600', color: THEME.colors.text.secondary, marginBottom: 4, marginLeft: 12 },
    bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
    myBubble: { backgroundColor: THEME.colors.primary, borderBottomRightRadius: 4 },
    otherBubble: { backgroundColor: '#F0F2F5', borderBottomLeftRadius: 4 },
    messageText: { fontSize: 16, lineHeight: 22 },
    myText: { color: 'white' },
    otherText: { color: THEME.colors.text.primary },
    timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    myTimestamp: { color: 'rgba(255,255,255,0.7)' },
    otherTimestamp: { color: THEME.colors.text.muted },
    inputContainer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: THEME.colors.border, backgroundColor: 'white' },
    inputInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', borderRadius: 28, paddingHorizontal: 16, paddingVertical: 4 },
    input: { flex: 1, paddingVertical: 10, fontSize: 16, color: THEME.colors.text.primary, maxHeight: 100 },
    sendBtn: { marginLeft: 8 },
    sendIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.primary, justifyContent: 'center', alignItems: 'center' }
});

