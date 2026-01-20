import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
    const { session, isLoading } = useAuth();

    const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

    useEffect(() => {
        checkFirstLaunch();
    }, []);

    async function checkFirstLaunch() {
        try {
            const hasLaunched = await AsyncStorage.getItem('hasLaunched');
            setIsFirstLaunch(hasLaunched === null);
        } catch (error) {
            setIsFirstLaunch(false); // Default to false on error to avoid sticking
        }
    }

    useEffect(() => {
        console.log('Index - isLoading:', isLoading);
        console.log('Index - session:', session);
    }, [isLoading, session]);

    if (isLoading || isFirstLaunch === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text>Loading...</Text>
            </View>
        );
    }

    console.log('Index - Redirecting to:', isFirstLaunch ? 'onboarding' : (session ? 'dashboard' : 'login'));

    if (isFirstLaunch) {
        return <Redirect href="/onboarding" />;
    }

    if (session) {
        return <Redirect href="/(app)/dashboard" />;
    }

    return <Redirect href="/(auth)/login" />;
}
