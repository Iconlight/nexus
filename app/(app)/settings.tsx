import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert, SafeAreaView, StatusBar, ActivityIndicator, Switch } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';

export default function Settings() {
    const router = useRouter();
    const { theme, isDark, toggleTheme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companyId, setCompanyId] = useState('');
    const [companyName, setCompanyName] = useState('');

    // Office location settings
    const [officeLatitude, setOfficeLatitude] = useState('');
    const [officeLongitude, setOfficeLongitude] = useState('');
    const [officeRadius, setOfficeRadius] = useState('100');

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/login');
                return;
            }

            // Get user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id, role')
                .eq('id', session.user.id)
                .single();

            if (!profile || !['admin', 'ceo'].includes(profile.role)) {
                const msg = 'Only admins can access settings';
                Platform.OS === 'web' ? alert(msg) : Alert.alert('Access Denied', msg);
                router.back();
                return;
            }

            setCompanyId(profile.company_id);

            // Get company settings using RPC for proper location formatting
            const { data: company, error: rpcError } = await supabase.rpc('get_office_settings', {
                p_company_id: profile.company_id
            });

            if (rpcError) throw rpcError;

            if (company) {
                setCompanyName(company.name);
                setOfficeRadius(company.office_radius_meters?.toString() || '100');

                if (company.office_location) {
                    const coords = parseOfficeLocation(company.office_location);
                    if (coords) {
                        setOfficeLatitude(coords.latitude.toString());
                        setOfficeLongitude(coords.longitude.toString());
                    }
                }
            }
        } catch (error: any) {
            console.error('Error loading settings:', error);
            const msg = error.message || 'Failed to load settings';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    }

    function parseOfficeLocation(location: any): { latitude: number; longitude: number } | null {
        try {
            if (!location) return null;

            // Handle GeoJSON format (returned by our get_office_settings RPC)
            if (location.type === 'Point' && Array.isArray(location.coordinates)) {
                return {
                    longitude: location.coordinates[0],
                    latitude: location.coordinates[1]
                };
            }

            // Handle WKT string format
            if (typeof location === 'string') {
                const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
                if (match) {
                    return {
                        longitude: parseFloat(match[1]),
                        latitude: parseFloat(match[2])
                    };
                }
            }

            // Handle raw coordinates object if somehow passed
            if (location.coordinates) {
                return {
                    longitude: location.coordinates[0],
                    latitude: location.coordinates[1]
                };
            }
        } catch (error) {
            console.error('Error parsing location:', error);
        }
        return null;
    }

    async function captureCurrentLocation() {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                const msg = 'Permission to access location was denied';
                Platform.OS === 'web' ? alert(msg) : Alert.alert('Permission Denied', msg);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });

            setOfficeLatitude(location.coords.latitude.toString());
            setOfficeLongitude(location.coords.longitude.toString());

            const successMsg = 'Location captured successfully!';
            Platform.OS === 'web' ? alert(successMsg) : Alert.alert('Success', successMsg);
        } catch (error: any) {
            console.error('Error capturing location:', error);
            const msg = error.message || 'Failed to capture location';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        }
    }

    async function saveSettings() {
        if (!officeLatitude || !officeLongitude) {
            const msg = 'Please set office location first';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Validation Error', msg);
            return;
        }

        const lat = parseFloat(officeLatitude);
        const lon = parseFloat(officeLongitude);
        const radius = parseInt(officeRadius);

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            const msg = 'Invalid coordinates. Latitude: -90 to 90, Longitude: -180 to 180';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Validation Error', msg);
            return;
        }

        if (isNaN(radius) || radius < 10 || radius > 5000) {
            const msg = 'Radius must be between 10 and 5000 meters';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Validation Error', msg);
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase.rpc('update_office_location', {
                p_company_id: companyId,
                p_latitude: lat,
                p_longitude: lon,
                p_radius: radius
            });

            if (error) throw error;

            // Check the response from the function
            if (data && !data.success) {
                throw new Error(data.message || 'Failed to save settings');
            }

            const successMsg = 'Office location saved successfully!';
            Platform.OS === 'web' ? alert(successMsg) : Alert.alert('Success', successMsg);
        } catch (error: any) {
            console.error('Error saving settings:', error);
            const msg = error.message || 'Failed to save settings';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Company Account</Text>
                    <Text style={styles.infoValue}>{companyName}</Text>
                    <Text style={styles.infoSub}>Organization Administrator Control</Text>
                </View>

                {/* Appearance Settings */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="moon-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>Appearance</Text>
                </View>

                <ModernCard style={styles.card}>
                    <View style={styles.rowBetween}>
                        <View>
                            <Text style={styles.settingLabel}>Dark Mode</Text>
                            <Text style={styles.settingDesc}>Enable dark theme for the application</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#e0e0e0', true: theme.colors.primary }}
                            thumbColor={'white'}
                        />
                    </View>
                </ModernCard>

                <View style={styles.sectionHeader}>
                    <Ionicons name="map-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>Geo-Fencing Settings</Text>
                </View>

                <ModernCard style={styles.card}>
                    <Text style={styles.description}>
                        Define the physical boundary of your office. Employees will only be allowed to check in when within the specified radius.
                    </Text>

                    <TouchableOpacity style={styles.captureBtn} onPress={captureCurrentLocation}>
                        <Ionicons name="location" size={20} color="white" />
                        <Text style={styles.captureBtnText}>Capture Current Location</Text>
                    </TouchableOpacity>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Latitude</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 40.7128"
                            value={officeLatitude}
                            onChangeText={setOfficeLatitude}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Longitude</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. -74.0060"
                            value={officeLongitude}
                            onChangeText={setOfficeLongitude}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Allowed Radius (meters)</Text>
                        <View style={styles.radiusInputRow}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="100"
                                value={officeRadius}
                                onChangeText={setOfficeRadius}
                                keyboardType="numeric"
                            />
                            <View style={styles.unitBadge}>
                                <Text style={styles.unitText}>METERS</Text>
                            </View>
                        </View>
                        <Text style={styles.hint}>
                            Check-ins allowed within {officeRadius || '100'}m of coordinates.
                        </Text>
                    </View>

                    {officeLatitude && officeLongitude && (
                        <View style={styles.previewBox}>
                            <Ionicons name="information-circle" size={16} color={THEME.colors.primary} />
                            <Text style={styles.previewText}>
                                Active: {parseFloat(officeLatitude).toFixed(4)}, {parseFloat(officeLongitude).toFixed(4)}
                            </Text>
                        </View>
                    )}
                </ModernCard>

                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={saveSettings}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload" size={22} color="white" />
                            <Text style={styles.saveBtnText}>Save Configuration</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.card,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: theme.colors.background },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary },
    scrollContent: { padding: theme.spacing.lg },
    infoBox: { marginBottom: 32 },
    infoLabel: { fontSize: 13, color: theme.colors.text.muted, fontWeight: '600', textTransform: 'uppercase' },
    infoValue: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary, marginTop: 4 },
    infoSub: { fontSize: 12, color: theme.colors.primary, fontWeight: '500', marginTop: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
    card: { padding: 20, marginBottom: 24 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    settingLabel: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 4 },
    settingDesc: { fontSize: 13, color: theme.colors.text.secondary },
    description: { fontSize: 14, color: theme.colors.text.secondary, lineHeight: 20, marginBottom: 24 },
    captureBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 16,
        gap: 8,
        marginBottom: 24,
        elevation: 2,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    captureBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.text.secondary, marginBottom: 8 },
    input: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border, fontSize: 15, color: theme.colors.text.primary },
    radiusInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    unitBadge: { backgroundColor: theme.colors.background, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
    unitText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.text.muted },
    hint: { fontSize: 11, color: theme.colors.text.muted, fontStyle: 'italic', marginTop: 6 },
    previewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primary + '10', padding: 10, borderRadius: 10, marginTop: 4 },
    previewText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.success,
        padding: 18,
        borderRadius: 18,
        gap: 12,
        marginBottom: 40,
        elevation: 2,
        shadowColor: theme.colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
