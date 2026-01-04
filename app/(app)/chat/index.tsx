import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { THEME } from '../../../src/constants/Theme';
import { ModernCard } from '../../../src/components/ModernCard';

type Channel = {
    id: string;
    name: string;
    type: 'department' | 'admin_support' | 'dm';
    participant_a?: string;
    participant_b?: string;
    profiles_a?: { first_name: string; last_name: string };
    profiles_b?: { first_name: string; last_name: string };
    isPotential?: boolean;
    partner_id?: string;
    unread_count?: number;
};

export default function ChatList() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const router = useRouter();
    const styles = useMemo(() => createStyles(theme), [theme]);

    useFocusEffect(
        React.useCallback(() => {
            fetchChannels();
        }, [user])
    );

    async function fetchChannels() {
        if (!user) return;
        try {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            const myRole = profile?.role;

            const { data: existing, error } = await supabase
                .from('chat_channels')
                .select('*, profiles_a:participant_a(first_name, last_name), profiles_b:participant_b(first_name, last_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch unread messages
            const { data: unreadData } = await supabase
                .from('chat_messages')
                .select('channel_id')
                .eq('is_read', false)
                .neq('sender_id', user.id);

            const unreadMap: Record<string, number> = {};
            unreadData?.forEach((msg: any) => {
                unreadMap[msg.channel_id] = (unreadMap[msg.channel_id] || 0) + 1;
            });

            let potentialPartners: any[] = [];
            if (myRole === 'admin' || myRole === 'ceo' || myRole === 'hr') {
                const { data: managers } = await supabase.from('profiles').select('id, first_name, last_name, role').eq('role', 'manager').eq('is_active', true);
                potentialPartners = managers || [];
            } else if (myRole === 'manager') {
                const { data: admins } = await supabase.from('profiles').select('id, first_name, last_name, role').in('role', ['admin', 'ceo', 'hr']).eq('is_active', true);
                potentialPartners = admins || [];
            }

            const activeIds = new Set();
            const results: Channel[] = [];
            existing?.forEach(ch => {
                const chWithCount = { ...ch, unread_count: unreadMap[ch.id] || 0 };
                if (ch.type === 'dm') {
                    const partnerId = ch.participant_a === user.id ? ch.participant_b : ch.participant_a;
                    if (partnerId && partnerId !== user.id) {
                        activeIds.add(partnerId);
                        results.push(chWithCount);
                    }
                } else {
                    results.push(chWithCount);
                }
            });

            potentialPartners.forEach(p => {
                if (!activeIds.has(p.id) && p.id !== user.id) {
                    results.push({
                        id: `p-${p.id}`,
                        name: `${p.first_name} ${p.last_name}`,
                        type: 'dm',
                        isPotential: true,
                        partner_id: p.id,
                        unread_count: 0
                    } as Channel);
                }
            });

            setChannels(results);
        } catch (error) {
            console.error('Error fetching channels:', error);
        } finally {
            setLoading(false);
        }
    }

    const renderItem = ({ item }: { item: Channel }) => {
        let displayName = item.name;
        let subText = item.type === 'department' ? 'Department Team' : 'Leadership Group';
        let iconName: any = item.type === 'department' ? 'people' : 'ribbon';
        let iconColor = item.type === 'department' ? theme.colors.primary : theme.colors.warning;

        if (item.type === 'dm') {
            if (item.isPotential) {
                displayName = item.name;
                subText = 'Start a conversation';
                iconName = 'chatbubble-outline';
                iconColor = theme.colors.text.muted;
            } else {
                const isA = item.participant_a === user?.id;
                const partner = isA ? item.profiles_b : item.profiles_a;
                displayName = partner ? `${partner.first_name} ${partner.last_name}` : 'Direct Message';
                subText = 'Private DM';
                iconName = 'chatbox-ellipses';
                iconColor = theme.colors.info;
            }
        }

        return (
            <TouchableOpacity
                onPress={() => item.isPotential ? router.push(`/(app)/chat/new?partnerId=${item.partner_id}`) : router.push(`/(app)/chat/${item.id}`)}
                activeOpacity={0.7}
            >
                <ModernCard style={styles.card}>
                    <View style={[styles.iconBox, { backgroundColor: `${iconColor}15` }]}>
                        <Ionicons name={iconName} size={24} color={iconColor} />
                    </View>
                    <View style={styles.textBox}>
                        <Text style={styles.name}>{displayName}</Text>
                        <Text style={styles.type}>{subText}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        {!!item.unread_count && item.unread_count > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{item.unread_count}</Text>
                            </View>
                        )}
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
                    </View>
                </ModernCard>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : channels.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.text.muted} />
                    <Text style={styles.emptyText}>No active conversations</Text>
                    <Text style={styles.emptySub}>Start a chat with your team or leadshership</Text>
                </View>
            ) : (
                <FlatList
                    data={channels}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { padding: theme.spacing.lg, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary },
    list: { padding: theme.spacing.lg },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, backgroundColor: theme.colors.card },
    iconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    textBox: { flex: 1 },
    name: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text.primary },
    type: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: theme.colors.text.primary, fontSize: 18, fontWeight: 'bold', marginTop: 16 },
    emptySub: { color: theme.colors.text.secondary, fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
    badge: { backgroundColor: theme.colors.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' }
});

