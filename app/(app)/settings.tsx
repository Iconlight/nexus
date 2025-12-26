import { View, Text, StyleSheet, ScrollView, TextInput, Button, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import * as Location from 'expo-location';

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
    const [currentDistance, setCurrentDistance] = useState<number | null>(null);

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

                // Parse office location if exists
                if (company.office_location) {
                    // PostGIS returns GeoJSON format
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
            // Handle different PostGIS return formats
            if (typeof location === 'string') {
                // Format: "POINT(longitude latitude)"
                const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
                if (match) {
                    return {
                        longitude: parseFloat(match[1]),
                        latitude: parseFloat(match[2])
                    };
                }
            } else if (location?.coordinates) {
                // GeoJSON format
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

            const msg = 'Capturing current location...';
            Platform.OS === 'web' ? console.log(msg) : Alert.alert('Info', msg);

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
            // Update company with PostGIS POINT
            const { error } = await supabase.rpc('update_office_location', {
                p_company_id: companyId,
                p_latitude: lat,
                p_longitude: lon,
                p_radius: radius
            });

            if (error) throw error;

            const msg = 'Office location saved successfully!';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
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
            <View style={styles.container}>
                <Text>Loading settings...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Company Settings</Text>
                <Button title="← Back" onPress={() => router.back()} />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Company Information</Text>
                <Text style={styles.label}>Company Name:</Text>
                <Text style={styles.value}>{companyName}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Office Location (Geo-Fencing)</Text>
                <Text style={styles.description}>
                    Set your office location to restrict employee check-ins to within a specific radius.
                </Text>

                <Button
                    title="📍 Capture Current Location"
                    onPress={captureCurrentLocation}
                    color="#2196f3"
                />

                <Text style={styles.label}>Latitude:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 40.7128"
                    value={officeLatitude}
                    onChangeText={setOfficeLatitude}
                    keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Longitude:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. -74.0060"
                    value={officeLongitude}
                    onChangeText={setOfficeLongitude}
                    keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Allowed Radius (meters):</Text>
                <TextInput
                    style={styles.input}
                    placeholder="100"
                    value={officeRadius}
                    onChangeText={setOfficeRadius}
                    keyboardType="numeric"
                />
                <Text style={styles.hint}>
                    Employees must be within {officeRadius || '100'}m of the office to check in
                </Text>

                {officeLatitude && officeLongitude && (
                    <View style={styles.preview}>
                        <Text style={styles.previewTitle}>Current Settings:</Text>
                        <Text>📍 Location: {parseFloat(officeLatitude).toFixed(6)}, {parseFloat(officeLongitude).toFixed(6)}</Text>
                        <Text>📏 Radius: {officeRadius}m</Text>
                    </View>
                )}

                <Button
                    title={saving ? "Saving..." : "Save Settings"}
                    onPress={saveSettings}
                    disabled={saving}
                    color="#4caf50"
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: 'white',
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: 'white',
        margin: 16,
        padding: 16,
        borderRadius: 8,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },
    value: {
        fontSize: 16,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 12,
        fontSize: 16,
    },
    hint: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    preview: {
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 4,
        marginTop: 12,
        gap: 4,
    },
    previewTitle: {
        fontWeight: '600',
        marginBottom: 4,
    },
});
