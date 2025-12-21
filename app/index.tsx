import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useEffect } from 'react';

export default function Index() {
    const { session, isLoading } = useAuth();

    useEffect(() => {
        console.log('Index - isLoading:', isLoading);
        console.log('Index - session:', session);
    }, [isLoading, session]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    console.log('Index - Redirecting to:', session ? 'dashboard' : 'login');

    if (session) {
        return <Redirect href="/(app)/dashboard" />;
    }

    return <Redirect href="/(auth)/login" />;
}
