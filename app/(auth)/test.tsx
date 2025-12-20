import { View, Text, StyleSheet, Button } from 'react-native';
import { supabase } from '../../src/services/supabase';

export default function TestConnection() {
    async function testConnection() {
        console.log('=== TESTING SUPABASE CONNECTION ===');
        console.log('URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
        console.log('Has Key:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

        try {
            const { data, error } = await supabase.from('companies').select('count').limit(1);
            console.log('Query result:', { data, error });

            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                alert('Connection successful!');
            }
        } catch (e: any) {
            console.error('Test failed:', e);
            alert(`Failed: ${e.message}`);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Supabase Connection Test</Text>
            <Text>URL: {process.env.EXPO_PUBLIC_SUPABASE_URL || 'NOT SET'}</Text>
            <Text>Key: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}</Text>
            <Button title="Test Connection" onPress={testConnection} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
});
