import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';

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
};

export default function ChatList() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetchChannels();
    }, [user]);

    async function fetchChannels() {
        if (!user) return;
        try {
            // 1. Fetch current user role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const myRole = profile?.role;

            // 2. Fetch existing channels
            const { data: existing, error } = await supabase
                .from('chat_channels')
                .select(`
                    *,
                    profiles_a:participant_a(first_name, last_name),
                    profiles_b:participant_b(first_name, last_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 3. Fetch potential partners
            // Admins can message Managers. Managers can message Admins.
            let potentialPartners: any[] = [];
            if (myRole === 'admin' || myRole === 'ceo' || myRole === 'hr') {
                // Fetch all managers
                const { data: managers } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, role')
                    .eq('role', 'manager')
                    .eq('is_active', true);
                potentialPartners = managers || [];
            } else if (myRole === 'manager') {
                // Fetch all admins
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, role')
                    .in('role', ['admin', 'ceo', 'hr'])
                    .eq('is_active', true);
                potentialPartners = admins || [];
            }

            // 4. Merge
            const activeIds = new Set();
            const results: Channel[] = [];

            existing?.forEach(ch => {
                if (ch.type === 'dm') {
                    const partnerId = ch.participant_a === user.id ? ch.participant_b : ch.participant_a;
                    // Only add if it's not a self-DM
                    if (partnerId && partnerId !== user.id) {
                        activeIds.add(partnerId);
                        results.push(ch);
                    }
                } else {
                    results.push(ch);
                }
            });

            potentialPartners.forEach(p => {
                // Triple check: not in active DMs and not the current user
                if (!activeIds.has(p.id) && p.id !== user.id) {
                    results.push({
                        id: `p-${p.id}`,
                        name: `${p.first_name} ${p.last_name}`,
                        type: 'dm',
                        isPotential: true,
                        partner_id: p.id
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
        let subText = item.type === 'department' ? 'Team Chat' : 'Leadership Support';
        let iconName: any = item.type === 'department' ? 'people' : 'shield-checkmark';
        let iconColor = item.type === 'department' ? '#2196f3' : '#e91e63';

        if (item.type === 'dm') {
            if (item.isPotential) {
                displayName = item.name;
                subText = 'Start a conversation';
                iconName = 'chatbubble-outline';
                iconColor = '#999';
            } else {
                const isA = item.participant_a === user?.id;
                const partner = isA ? item.profiles_b : item.profiles_a;
                displayName = partner ? `${partner.first_name} ${partner.last_name}` : 'Direct Message';
                subText = 'Private Message';
                iconName = 'person';
                iconColor = '#4caf50';
            }
        }

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    if (item.isPotential) {
                        router.push(`/(app)/chat/new?partnerId=${item.partner_id}`);
                    } else {
                        router.push(`/(app)/chat/${item.id}`);
                    }
                }}
            >
                <View style={[styles.iconBox, { backgroundColor: `${iconColor}15` }]}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </View>
                <View style={styles.textBox}>
                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.type}>{subText}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2196f3" />
                </View>
            ) : channels.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>No active chats found.</Text>
                </View>
            ) : (
                <FlatList
                    data={channels}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { padding: 20, paddingTop: 60, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 28, fontWeight: 'bold' },
    list: { padding: 16 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    textBox: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#333' },
    type: { fontSize: 13, color: '#888', marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#999', fontSize: 16 }
});
