import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';

export default function Settings() {
    const router = useRouter();
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

            // Get company settings
            const { data: company } = await supabase
                .from('companies')
                .select('name, office_location, office_radius_meters')
                .eq('id', profile.company_id)
                .single();

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
            if (typeof location === 'string') {
                const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
                if (match) {
                    return {
                        longitude: parseFloat(match[1]),
                        latitude: parseFloat(match[2])
                    };
                }
            } else if (location?.coordinates) {
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
            Alert.alert('Validation Error', 'Please set office location first');
            return;
        }

        const lat = parseFloat(officeLatitude);
        const lon = parseFloat(officeLongitude);
        const radius = parseInt(officeRadius);

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            Alert.alert('Validation Error', 'Invalid coordinates. Latitude: -90 to 90, Longitude: -180 to 180');
            return;
        }

        if (isNaN(radius) || radius < 10 || radius > 5000) {
            Alert.alert('Validation Error', 'Radius must be between 10 and 5000 meters');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.rpc('update_office_location', {
                p_company_id: companyId,
                p_latitude: lat,
                p_longitude: lon,
                p_radius: radius
            });

            if (error) throw error;
            Alert.alert('Success', 'Office location saved successfully!');
        } catch (error: any) {
            console.error('Error saving settings:', error);
            Alert.alert('Error', error.message || 'Failed to save settings');
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
                    <Ionicons name="arrow-back" size={24} color={THEME.colors.text.primary} />
                </TouchableOpacity>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Company Account</Text>
                    <Text style={styles.infoValue}>{companyName}</Text>
                    <Text style={styles.infoSub}>Organization Administrator Control</Text>
                </View>

                <View style={styles.sectionHeader}>
                    <Ionicons name="map-outline" size={20} color={THEME.colors.primary} />
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: THEME.spacing.lg,
        paddingVertical: THEME.spacing.md,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: '#f8f9fa' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.colors.text.primary },
    scrollContent: { padding: THEME.spacing.lg },
    infoBox: { marginBottom: 32 },
    infoLabel: { fontSize: 13, color: THEME.colors.text.muted, fontWeight: '600', textTransform: 'uppercase' },
    infoValue: { fontSize: 24, fontWeight: 'bold', color: THEME.colors.text.primary, marginTop: 4 },
    infoSub: { fontSize: 12, color: THEME.colors.primary, fontWeight: '500', marginTop: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: THEME.colors.text.primary },
    card: { padding: 20, marginBottom: 24 },
    description: { fontSize: 14, color: THEME.colors.text.secondary, lineHeight: 20, marginBottom: 24 },
    captureBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME.colors.primary,
        padding: 16,
        borderRadius: 16,
        gap: 8,
        marginBottom: 24,
        elevation: 2,
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    captureBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', color: THEME.colors.text.secondary, marginBottom: 8 },
    input: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eee', fontSize: 15 },
    radiusInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    unitBadge: { backgroundColor: '#eee', paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12 },
    unitText: { fontSize: 12, fontWeight: 'bold', color: THEME.colors.text.muted },
    hint: { fontSize: 11, color: THEME.colors.text.muted, fontStyle: 'italic', marginTop: 6 },
    previewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.colors.primary + '10', padding: 10, borderRadius: 10, marginTop: 4 },
    previewText: { fontSize: 12, color: THEME.colors.primary, fontWeight: '600' },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME.colors.success,
        padding: 18,
        borderRadius: 18,
        gap: 12,
        marginBottom: 40,
        elevation: 2,
        shadowColor: THEME.colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
