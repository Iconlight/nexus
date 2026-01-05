import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, KeyboardAvoidingView, ScrollView } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/constants/Theme';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ModernCard } from '../../src/components/ModernCard';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

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
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
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
                                <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>EMAIL ADDRESS</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color={theme.colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@company.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholderTextColor={theme.colors.text.muted}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>PASSWORD</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    placeholderTextColor={theme.colors.text.muted}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={theme.colors.text.muted}
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

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    brandName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginTop: 16,
    },
    brandTagline: {
        fontSize: 14,
        color: theme.colors.text.muted,
        marginTop: 4,
    },
    loginCard: {
        padding: 24,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    cardSubtitle: {
        fontSize: 14,
        color: theme.colors.text.muted,
        marginBottom: 32,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.error + '10',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        gap: 8,
    },
    errorText: {
        color: theme.colors.error,
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
        color: theme.colors.text.muted,
        marginBottom: 8,
        letterSpacing: 1,
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
    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: 32,
    },
    forgotText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    signInBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
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
        color: theme.colors.text.muted,
        fontSize: 14,
    },
    signUpLink: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 15,
    },
});
