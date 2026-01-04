import { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { THEME } from '../../../src/constants/Theme';

export default function NewChatRedirect() {
    const { partnerId } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    useEffect(() => {
        if (partnerId && user) {
            handleRedirect();
        }
    }, [partnerId, user]);

    async function handleRedirect() {
        try {
            // 1. Check if DM already exists
            const { data: existing } = await supabase
                .from('chat_channels')
                .select('id')
                .eq('type', 'dm')
                .or(`and(participant_a.eq.${user.id},participant_b.eq.${partnerId}),and(participant_a.eq.${partnerId},participant_b.eq.${user.id})`)
                .maybeSingle();

            if (existing) {
                router.replace(`/(app)/chat/${existing.id}`);
                return;
            }

            // 2. Create it
            const [pA, pB] = [user.id, partnerId].sort();
            const { data: newChannel, error } = await supabase
                .from('chat_channels')
                .insert({
                    name: `DM`,
                    type: 'dm',
                    participant_a: pA,
                    participant_b: pB
                })
                .select('id')
                .single();

            if (error) throw error;
            router.replace(`/(app)/chat/${newChannel.id}`);
        } catch (error) {
            console.error('Redirect error:', error);
            router.replace('/(app)/chat');
        }
    }

    return (
        <View style={styles.center}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }
});
