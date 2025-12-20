import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';

export default function CompanySignup() {
    const [companyName, setCompanyName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const router = useRouter();

    // Custom alert that works on web
    const showAlert = (title: string, message: string, onOk?: () => void) => {
        setStatusMessage(`${title}: ${message}`);

        if (Platform.OS === 'web') {
            alert(`${title}\n\n${message}`);
            if (onOk) onOk();
        } else {
            Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
        }
    };

    async function handleSignup() {
        setStatusMessage('');

        // Validation
        if (!companyName || !firstName || !lastName || !email || !password) {
            showAlert('Error', 'Please fill in all required fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Error', 'Please enter a valid email address');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 8) {
            showAlert('Error', 'Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        setStatusMessage('Creating your company account...');

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            console.log('Supabase URL:', supabaseUrl);
            console.log('Has Anon Key:', !!supabaseKey);

            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Supabase configuration missing. Please check your .env file.');
            }

            const url = `${supabaseUrl}/functions/v1/company-signup`;
            console.log('Calling Edge Function:', url);

            const requestBody = {
                companyName,
                adminEmail: email,
                adminPassword: password,
                adminFirstName: firstName,
                adminLastName: lastName,
                adminPhone: phone,
            };

            console.log('Request body:', { ...requestBody, adminPassword: '***' });

            // Call the Supabase Edge Function
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            const responseText = await response.text();
            console.log('Response text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Invalid response from server: ${responseText}`);
            }

            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            console.log('Success:', data);
            setStatusMessage('Account created! Logging you in...');

            // Auto-login the user
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                console.error('Auto-login failed:', signInError);
                showAlert(
                    'Success',
                    'Account created successfully! Please log in with your credentials.',
                    () => router.replace('/(auth)/login')
                );
            } else {
                console.log('Auto-login successful');
                setStatusMessage('Success! Redirecting to dashboard...');
                // The AuthContext will handle the redirect to dashboard
                setTimeout(() => {
                    router.replace('/(app)/dashboard');
                }, 500);
            }

        } catch (error: any) {
            console.error('Signup error:', error);
            showAlert('Error', error.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Create Company Account</Text>
                <Text style={styles.subtitle}>Set up your organization</Text>

                {statusMessage ? (
                    <View style={styles.statusContainer}>
                        <Text style={styles.statusText}>{statusMessage}</Text>
                    </View>
                ) : null}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Company Information</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Company Name *"
                        value={companyName}
                        onChangeText={setCompanyName}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Admin Information</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="First Name *"
                        value={firstName}
                        onChangeText={setFirstName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Last Name *"
                        value={lastName}
                        onChangeText={setLastName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Email *"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Phone (optional)"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password *"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm Password *"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>

                <Button
                    title={loading ? 'Creating Account...' : 'Create Company Account'}
                    onPress={handleSignup}
                    disabled={loading}
                />

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <Button
                        title="Sign In"
                        onPress={() => router.push('/(auth)/login')}
                    />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    input: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 12,
        fontSize: 16,
    },
    footer: {
        marginTop: 30,
        alignItems: 'center',
    },
    footerText: {
        marginBottom: 10,
        color: '#666',
    },
    statusContainer: {
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
    },
    statusText: {
        color: '#1976d2',
        fontSize: 14,
        fontWeight: '500',
    },
});
