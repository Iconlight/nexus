import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, KeyboardAvoidingView } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '../../src/components/ModernCard';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            let errorMsg = error.message;
            if (error.message.includes('Invalid login credentials')) {
                errorMsg = 'Invalid email or password. Please try again.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg = 'Please confirm your email address before logging in.';
            }
            showAlert('Login Failed', errorMsg);
            setLoading(false);
        } else {
            router.replace('/(app)/dashboard');
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.brandContainer}>
                        <View style={styles.logoBox}>
                            <Ionicons name="flash" size={40} color="white" />
                        </View>
                        <Text style={styles.brandName}>Nexus</Text>
                        <Text style={styles.brandTagline}>Intelligent Team Management</Text>
                    </View>

                    <ModernCard style={styles.loginCard}>
                        <Text style={styles.cardTitle}>Welcome Back</Text>
                        <Text style={styles.cardSubtitle}>Sign in to continue to your workspace</Text>

                        {errorMessage ? (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={18} color={THEME.colors.error} />
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>EMAIL ADDRESS</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color={THEME.colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@company.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholderTextColor={THEME.colors.text.muted}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>PASSWORD</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={THEME.colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    placeholderTextColor={THEME.colors.text.muted}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={THEME.colors.text.muted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.forgotBtn}>
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.signInBtn, loading && styles.btnDisabled]}
                            onPress={signInWithEmail}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={styles.signInText}>Sign In</Text>
                                    <Ionicons name="arrow-forward" size={18} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </ModernCard>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>New to Nexus?</Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                            <Text style={styles.signUpLink}>Create Company Account</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Re-using some components but importing ScrollView localy
import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoBox: {
        width: 70,
        height: 70,
        borderRadius: 20,
        backgroundColor: THEME.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    brandName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: THEME.colors.text.primary,
        marginTop: 16,
    },
    brandTagline: {
        fontSize: 14,
        color: THEME.colors.text.muted,
        marginTop: 4,
    },
    loginCard: {
        padding: 24,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: THEME.colors.text.primary,
        marginBottom: 8,
    },
    cardSubtitle: {
        fontSize: 14,
        color: THEME.colors.text.muted,
        marginBottom: 32,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.colors.error + '10',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        gap: 8,
    },
    errorText: {
        color: THEME.colors.error,
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: THEME.colors.text.muted,
        marginBottom: 8,
        letterSpacing: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: THEME.colors.text.primary,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: 32,
    },
    forgotText: {
        color: THEME.colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    signInBtn: {
        backgroundColor: THEME.colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    btnDisabled: {
        opacity: 0.7,
    },
    signInText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        color: THEME.colors.text.muted,
        fontSize: 14,
    },
    signUpLink: {
        color: THEME.colors.primary,
        fontWeight: 'bold',
        fontSize: 15,
    },
});
