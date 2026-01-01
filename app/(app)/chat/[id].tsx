import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

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

    const flatListRef = useRef<FlatList>(null);

    // Initial fetch
    useEffect(() => {
        if (!channelId) return;
        fetchMessages();

        const channel = supabase.channel(`room:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `channel_id=eq.${channelId}`
                },
                (payload) => {
                    // Fetch the full message with sender profile
                    fetchNewMessage(payload.new.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [channelId]);

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
        const { data } = await supabase
            .from('chat_messages')
            .select('*, profiles(first_name, last_name)')
            .eq('id', messageId)
            .single();

        if (data) {
            setMessages(prev => {
                // Check if this incoming message matches any of our optimistic "sending" messages
                // We match by content and sender_id within a short time window
                const optimisticIdx = prev.findIndex(m =>
                    m.status === 'sending' &&
                    m.content === data.content &&
                    m.sender_id === data.sender_id
                );

                if (optimisticIdx !== -1) {
                    const newMsgs = [...prev];
                    newMsgs[optimisticIdx] = { ...data, status: 'sent' };
                    return newMsgs;
                }

                // If no optimistic match, just append normally with dedupe
                if (prev.find(m => m.id === data.id)) return prev;
                return [...prev, { ...data, status: 'sent' }];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }

    async function sendMessage() {
        const text = inputText.trim();
        if (!text) return;

        // 1. Create temporary optimistic message
        const tempId = `optimistic-${Math.random().toString(36).substr(2, 9)}`;
        const optimisticMsg: Message = {
            id: tempId,
            content: text,
            sender_id: user?.id || '',
            created_at: new Date().toISOString(),
            status: 'sending'
        };

        // 2. Add to UI immediately
        setMessages(prev => [...prev, optimisticMsg]);
        setInputText('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    channel_id: channelId,
                    sender_id: user?.id,
                    content: text
                });

            if (error) throw error;
            // The real-time listener will handle updating the message status to 'sent' via fetchNewMessage
        } catch (error) {
            console.error('Send error:', error);
            // Mark optimistic message as error
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
                    item.status === 'sending' && { opacity: 0.6 }
                ]}>
                    <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>
                        {item.content}
                    </Text>
                </View>
                {item.status === 'error' && (
                    <Text style={{ fontSize: 10, color: '#f44336', marginTop: 2 }}>Tap to retry</Text>
                )}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#fff' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chat</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator /></View>
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
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    multiline
                />
                <TouchableOpacity onPress={sendMessage} disabled={!inputText.trim()} style={styles.sendBtn}>
                    <Ionicons name="send" size={24} color={inputText.trim() ? '#2196f3' : '#ccc'} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: 'white' },
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 20 },
    bubbleWrapper: { marginBottom: 12, maxWidth: '80%' },
    myWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    otherWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    senderName: { fontSize: 12, color: '#999', marginBottom: 4, marginLeft: 4 },
    bubble: { padding: 12, borderRadius: 20 },
    myBubble: { backgroundColor: '#2196f3', borderBottomRightRadius: 4 },
    otherBubble: { backgroundColor: '#f0f0f0', borderBottomLeftRadius: 4 },
    messageText: { fontSize: 16, lineHeight: 22 },
    myText: { color: 'white' },
    otherText: { color: '#333' },
    inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#eee', alignItems: 'center', backgroundColor: 'white' },
    input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 16 },
    sendBtn: { marginLeft: 12, padding: 8 }
});
