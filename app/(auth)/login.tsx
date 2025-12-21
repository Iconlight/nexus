import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useRouter } from 'expo-router';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const router = useRouter();

    const showAlert = (title: string, message: string) => {
        setErrorMessage(message);
        if (Platform.OS === 'web') {
            alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    async function signInWithEmail() {
        setErrorMessage('');
        setLoading(true);

        console.log('Attempting login with:', email);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('Login error:', error);
            let errorMsg = error.message;

            // Provide more helpful error messages
            if (error.message.includes('Invalid login credentials')) {
                errorMsg = 'Invalid email or password. Please check your credentials and try again.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg = 'Please confirm your email address before logging in.';
            }

            showAlert('Error', errorMsg);
            setLoading(false);
        } else {
            console.log('Login successful:', data);
            console.log('Session:', data.session);
            // Explicitly redirect to dashboard
            router.replace('/(app)/dashboard');
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Nexus Login</Text>
            {errorMessage ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            ) : null}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    onChangeText={setEmail}
                    value={email}
                    placeholder="email@address.com"
                    autoCapitalize="none"
                />
            </View>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    onChangeText={setPassword}
                    value={password}
                    placeholder="Password"
                    secureTextEntry={true}
                    autoCapitalize="none"
                />
            </View>
            <View style={styles.buttonContainer}>
                <Button title={loading ? "Loading..." : "Sign In"} onPress={signInWithEmail} disabled={loading} />
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have a company account?</Text>
                <Button title="Create Company Account" onPress={() => router.push('/(auth)/signup')} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#f44336',
    },
    errorText: {
        color: '#c62828',
        fontSize: 14,
        fontWeight: '500',
    },
    inputContainer: {
        marginBottom: 12,
    },
    input: {
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    buttonContainer: {
        marginTop: 10,
    },
    footer: {
        marginTop: 30,
        alignItems: 'center',
    },
    footerText: {
        marginBottom: 10,
        color: '#666',
    },
});
