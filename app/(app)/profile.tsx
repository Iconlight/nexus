import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';
import { useState, useEffect } from 'react';
import { supabase } from '../../src/services/supabase';

export default function ProfileScreen() {
    const { signOut, user } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    async function fetchProfile() {
        const { data } = await supabase
            .from('profiles')
            .select('*, company:companies(name)')
            .eq('id', user?.id)
            .single();
        setProfile(data);
    }

    if (!profile) return null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={THEME.colors.text.primary} />
                </TouchableOpacity>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{profile.first_name[0]}{profile.last_name[0]}</Text>
                    </View>
                    <Text style={styles.name}>{profile.first_name} {profile.last_name}</Text>
                    <Text style={styles.email}>{profile.email}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: THEME.colors.primary + '15' }]}>
                        <Text style={[styles.roleText, { color: THEME.colors.primary }]}>{profile.role.toUpperCase()}</Text>
                    </View>
                </View>

                <ModernCard style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Ionicons name="briefcase-outline" size={20} color={THEME.colors.text.secondary} />
                        <View style={styles.infoText}>
                            <Text style={styles.label}>Job Title</Text>
                            <Text style={styles.value}>{profile.job_title || 'Not specified'}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={20} color={THEME.colors.text.secondary} />
                        <View style={styles.infoText}>
                            <Text style={styles.label}>Organization</Text>
                            <Text style={styles.value}>{profile.company?.name || 'Nexus'}</Text>
                        </View>
                    </View>
                </ModernCard>

                <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                    <Ionicons name="log-out-outline" size={20} color="white" />
                    <Text style={styles.signOutBtnText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Nexus v1.2.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: THEME.spacing.lg,
        paddingVertical: THEME.spacing.md,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: THEME.colors.text.primary,
    },
    content: {
        padding: THEME.spacing.lg,
        alignItems: 'center',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: THEME.spacing.xl,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: THEME.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 4,
        shadowColor: THEME.colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: THEME.colors.text.primary,
    },
    email: {
        fontSize: 14,
        color: THEME.colors.text.secondary,
        marginTop: 4,
    },
    roleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 12,
    },
    roleText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    infoSection: {
        width: '100%',
        padding: THEME.spacing.lg,
        marginBottom: THEME.spacing.xl,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    infoText: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: THEME.colors.text.muted,
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME.colors.text.primary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 16,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.colors.error,
        width: '100%',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
    },
    signOutBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    version: {
        marginTop: THEME.spacing.xl,
        color: THEME.colors.text.muted,
        fontSize: 12,
    }
});
