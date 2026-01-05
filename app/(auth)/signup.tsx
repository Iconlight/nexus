import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { THEME } from '../../src/constants/Theme';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '../../src/components/ModernCard';

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
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const showAlert = (title: string, message: string, onOk?: () => void) => {
        if (Platform.OS === 'web') {
            alert(`${title}\n\n${message}`);
            if (onOk) onOk();
        } else {
            Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
        }
    };

    async function handleSignup() {
        if (!companyName || !firstName || !lastName || !email || !password) {
            showAlert('Error', 'Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        setStatusMessage('Creating your company account...');

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Supabase configuration missing.');
            }

            const url = `${supabaseUrl}/functions/v1/company-signup`;
            const requestBody = {
                companyName,
                adminEmail: email,
                adminPassword: password,
                adminFirstName: firstName,
                adminLastName: lastName,
                adminPhone: phone,
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error('Server response error');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Server error');
            }

            // Auto-login
            await supabase.auth.signInWithPassword({ email, password });
            router.replace('/(app)/dashboard');

        } catch (error: any) {
            showAlert('Error', error.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.title}>Create Company</Text>
                        <Text style={styles.subtitle}>Set up your organization on Nexus</Text>
                    </View>

                    <ModernCard style={styles.formCard}>
                        <Text style={styles.sectionTitle}>ORGANIZATION DETAILS</Text>
                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="business-outline" size={20} color={theme.colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Company Name"
                                    value={companyName}
                                    onChangeText={setCompanyName}
                                    placeholderTextColor={theme.colors.text.muted}
                                />
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ADMINISTRATOR DETAILS</Text>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="First Name"
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholderTextColor={theme.colors.text.muted}
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChangeText={setLastName}
                                        placeholderTextColor={theme.colors.text.muted}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color={theme.colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Admin Email"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholderTextColor={theme.colors.text.muted}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    placeholderTextColor={theme.colors.text.muted}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    placeholderTextColor={theme.colors.text.muted}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.signupBtn, loading && styles.btnDisabled]}
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={styles.signupText}>Create Account</Text>
                                    <Ionicons name="rocket-outline" size={18} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </ModernCard>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account?</Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: 24,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: theme.colors.text.muted,
    },
    formCard: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.text.muted,
        marginBottom: 16,
        letterSpacing: 1,
    },
    inputGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: theme.colors.text.primary,
    },
    signupBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        marginTop: 16,
        gap: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    btnDisabled: {
        opacity: 0.7,
    },
    signupText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    footer: {
        marginTop: 32,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        color: theme.colors.text.muted,
        fontSize: 14,
    },
    loginLink: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 15,
    },
});
