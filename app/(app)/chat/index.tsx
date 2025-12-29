import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';

type Channel = {
    id: string;
    name: string;
    type: 'department' | 'admin_support';
};

export default function ChatList() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchChannels();
    }, []);

    async function fetchChannels() {
        try {
            const { data, error } = await supabase
                .from('chat_channels')
                .select('*')
                .order('name');

            if (error) throw error;
            setChannels(data || []);
        } catch (error) {
            console.error('Error fetching channels:', error);
        } finally {
            setLoading(false);
        }
    }

    const renderItem = ({ item }: { item: Channel }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(app)/chat/${item.id}`)}
        >
            <View style={[styles.iconBox, { backgroundColor: item.type === 'department' ? '#e3f2fd' : '#fce4ec' }]}>
                <Ionicons
                    name={item.type === 'department' ? 'people' : 'shield-checkmark'}
                    size={24}
                    color={item.type === 'department' ? '#2196f3' : '#e91e63'}
                />
            </View>
            <View style={styles.textBox}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.type}>
                    {item.type === 'department' ? 'Team Chat' : 'Leadership Support'}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
    );

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
