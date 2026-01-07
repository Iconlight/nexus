import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/context/ThemeContext';
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
    const { theme, isDark } = useTheme();
    const router = useRouter();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [channelName, setChannelName] = useState('Chat');
    const [lastReadAt, setLastReadAt] = useState<string | null>(null);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!channelId) return;

        // Ensure user is registered as a participant (for join-date logic)
        supabase.rpc('join_chat_channel', { p_channel_id: channelId }).then();

        fetchChannelInfo();
        fetchMessages();
        markAllAsRead();

        const channel = supabase.channel(`room:${channelId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
                fetchNewMessage(payload.new.id);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [channelId]);

    async function markAllAsRead() {
        if (!user || !channelId) return;

        // Update both the messages status and our participant last_read_at
        const now = new Date().toISOString();

        await Promise.all([
            supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('channel_id', channelId)
                .neq('sender_id', user.id)
                .eq('is_read', false),

            supabase
                .from('chat_participants')
                .update({ last_read_at: now })
                .eq('channel_id', channelId)
                .eq('user_id', user.id)
        ]);
    }

    async function fetchChannelInfo() {
        const { data, error } = await supabase
            .from('chat_channels')
            .select('*, profiles_a:participant_a(first_name, last_name), profiles_b:participant_b(first_name, last_name)')
            .eq('id', channelId)
            .single();

        if (error) {
            console.error('Error fetching channel info:', error);
            return;
        }

        if (data) {
            if (data.type === 'dm') {
                const partner = data.participant_a === user?.id ? data.profiles_b : data.profiles_a;
                // Use a functional update or ensure this runs after mount.
                // Actually partner structure: { first_name, last_name }
                setChannelName(partner ? `${partner.first_name} ${partner.last_name}` : 'Direct Message');
            } else {
                setChannelName(data.name);
            }
        }
    }

    async function fetchMessages() {
        try {
            // Get user's join date for this channel
            const { data: participant } = await supabase
                .from('chat_participants')
                .select('joined_at, last_read_at')
                .eq('channel_id', channelId)
                .eq('user_id', user?.id)
                .single();

            const joinedAt = participant?.joined_at || new Date(0).toISOString();
            const lastReadAt = participant?.last_read_at || new Date(0).toISOString();

            const { data, error } = await supabase
                .from('chat_messages')
                .select('*, profiles(first_name, last_name)')
                .eq('channel_id', channelId)
                .gte('created_at', joinedAt)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const msgs = data || [];

            // Find the index of the first unread message
            let firstUnreadIdx = -1;
            for (let i = 0; i < msgs.length; i++) {
                if (msgs[i].sender_id !== user?.id && msgs[i].created_at > lastReadAt) {
                    firstUnreadIdx = i;
                    break;
                }
            }

            setMessages(msgs);

            // Auto-scroll to bottom once loaded
            setTimeout(() => {
                if (firstUnreadIdx !== -1 && flatListRef.current) {
                    // If there are unread, maybe scroll to those? 
                    // User requested scroll to bottom to see new chats.
                    flatListRef.current.scrollToEnd({ animated: false });
                } else {
                    flatListRef.current?.scrollToEnd({ animated: false });
                }
            }, 100);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchNewMessage(messageId: string) {
        const { data } = await supabase.from('chat_messages').select('*, profiles(first_name, last_name)').eq('id', messageId).single();
        if (data) {
            // Mark as read immediately if not mine
            if (data.sender_id !== user?.id) {
                supabase.from('chat_messages').update({ is_read: true }).eq('id', messageId).then();
            }

            setMessages(prev => {
                // Find optimistic message mainly by content and "sending" status
                // We relax the check to ensure we find it
                const optimisticIdx = prev.findIndex(m => m.status === 'sending' && m.content === data.content);

                if (optimisticIdx !== -1) {
                    const newMsgs = [...prev];
                    newMsgs[optimisticIdx] = { ...data, status: 'sent' };
                    return newMsgs;
                }
                // Check if already exists by ID to avoid duplicates
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

            // Manually mark as sent just in case subscription lags
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
        } catch (error) {
            console.error('Send error:', error);
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
        }
    }

    const renderMessage = ({ item, index }: { item: Message, index: number }) => {
        const isMe = item.sender_id === user?.id;
        const name = item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : 'You';

        // Check if this is the first unread message to show indicator
        // We'd need to have passed the lastReadAt to this function or state
        // For simplicity, let's assume we want to show it if it's the first message 
        // that's newer than some threshold we stored.

        // Actually, a better way is to identify the index in the messages array
        // and render a view before the bubble.

        return (
            <View>
                {/* Visual Unread Indicator would go here if we tracked it per render */}
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
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
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
                    <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
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
                            placeholderTextColor={theme.colors.text.muted}
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

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card },
    backBtn: { padding: 4 },
    headerInfo: { marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary },
    onlineStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success, marginRight: 6 },
    statusText: { fontSize: 12, color: theme.colors.text.secondary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 24 },
    bubbleWrapper: { marginBottom: 16, maxWidth: '85%' },
    myWrapper: { alignSelf: 'flex-end' },
    otherWrapper: { alignSelf: 'flex-start' },
    senderName: { fontSize: 12, fontWeight: '600', color: theme.colors.text.secondary, marginBottom: 4, marginLeft: 12 },
    bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
    myBubble: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
    otherBubble: { backgroundColor: theme.colors.border, borderBottomLeftRadius: 4 }, // Using border color or a specific surface color for other bubble
    messageText: { fontSize: 16, lineHeight: 22 },
    myText: { color: 'white' },
    otherText: { color: theme.colors.text.primary },
    timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    myTimestamp: { color: 'rgba(255,255,255,0.7)' },
    otherTimestamp: { color: theme.colors.text.muted },
    inputContainer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.card },
    inputInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.border },
    input: { flex: 1, paddingVertical: 10, fontSize: 16, color: theme.colors.text.primary, maxHeight: 100 },
    sendBtn: { marginLeft: 8 },
    sendIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
    unreadRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
    unreadLine: { flex: 1, height: 1, backgroundColor: theme.colors.error + '40' },
    unreadText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.error, textTransform: 'uppercase', letterSpacing: 1 }
});

