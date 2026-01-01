import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../src/constants/Theme';
import { ModernCard } from '../../src/components/ModernCard';
import { useRouter } from 'expo-router';

export default function CheckIn() {
  const { user } = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null);
  const [officeRadius, setOfficeRadius] = useState<number>(100);
  const [withinRange, setWithinRange] = useState<boolean>(true);

  useEffect(() => {
    loadTodayAttendance();
    requestLocationPermission();
    loadOfficeSettings();
  }, []);

  useEffect(() => {
    if (location) {
      checkDistanceToOffice();
    }
  }, [location]);

  async function requestLocationPermission() {
    try {
      setFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Failed to fetch precise location');
    } finally {
      setFetchingLocation(false);
    }
  }

  async function loadTodayAttendance() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', user?.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      setTodayAttendance(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  }

  async function loadOfficeSettings() {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data: company } = await supabase
        .from('companies')
        .select('office_radius_meters')
        .eq('id', profile.company_id)
        .single();

      if (company?.office_radius_meters) {
        setOfficeRadius(company.office_radius_meters);
      }
    } catch (error) {
      console.error('Error loading office settings:', error);
    }
  }

  async function checkDistanceToOffice() {
    if (!location) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase.rpc('calculate_distance_to_office', {
        p_company_id: profile.company_id,
        p_employee_lat: location.coords.latitude,
        p_employee_lon: location.coords.longitude
      });

      if (error) {
        console.error('Error calculating distance:', error);
        return;
      }

      if (data !== null) {
        setDistanceToOffice(data);
        setWithinRange(data <= officeRadius);
      } else {
        setWithinRange(true);
      }
    } catch (error) {
      console.error('Error checking distance:', error);
    }
  }

  async function handleCheckIn() {
    if (!location) {
      Alert.alert('Error', 'Location not available. Please enable location services.');
      return;
    }

    if (!withinRange) {
      const distance = distanceToOffice ? Math.round(distanceToOffice) : 0;
      Alert.alert('Out of Range', `You are ${distance}m from the office. You must be within ${officeRadius}m to check in.`);
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('attendance_logs')
        .insert({
          employee_id: user?.id,
          company_id: profile.company_id,
          check_in_time: new Date().toISOString(),
          check_in_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
          date: today,
          status: 'present',
        });

      if (error) throw error;
      Alert.alert('Success', 'Checked in successfully!');
      loadTodayAttendance();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!location || !todayAttendance) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .update({
          check_out_time: new Date().toISOString(),
          check_out_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
        })
        .eq('id', todayAttendance.id);

      if (error) throw error;
      Alert.alert('Success', 'Checked out successfully!');
      loadTodayAttendance();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={requestLocationPermission} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={THEME.colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <ModernCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color={THEME.colors.primary} />
            <Text style={styles.cardTitle}>Current Position</Text>
          </View>

          {fetchingLocation ? (
            <View style={styles.locLoading}>
              <ActivityIndicator color={THEME.colors.primary} />
              <Text style={styles.locLoadingText}>Acquiring GPS Signal...</Text>
            </View>
          ) : location ? (
            <View style={styles.locInfo}>
              <View style={styles.locRow}>
                <Text style={styles.locLabel}>Latitude</Text>
                <Text style={styles.locValue}>{location.coords.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.locRow}>
                <Text style={styles.locLabel}>Longitude</Text>
                <Text style={styles.locValue}>{location.coords.longitude.toFixed(6)}</Text>
              </View>
              <View style={styles.locRow}>
                <Text style={styles.locLabel}>Accuracy</Text>
                <Text style={styles.locValue}>±{location.coords.accuracy?.toFixed(0)}m</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Enable location services to continue</Text>
          )}
        </ModernCard>

        {distanceToOffice !== null && (
          <ModernCard style={[styles.statusCard, withinRange ? styles.rangeSuccess : styles.rangeDanger]}>
            <View style={styles.rangeHeader}>
              <Ionicons
                name={withinRange ? "checkmark-circle" : "close-circle"}
                size={28}
                color={withinRange ? THEME.colors.success : THEME.colors.error}
              />
              <View>
                <Text style={[styles.rangeTitle, { color: withinRange ? THEME.colors.success : THEME.colors.error }]}>
                  {withinRange ? "Within Range" : "Out of Range"}
                </Text>
                <Text style={styles.rangeSub}>
                  {Math.round(distanceToOffice)}m from office (Limit: {officeRadius}m)
                </Text>
              </View>
            </View>
          </ModernCard>
        )}

        <ModernCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={24} color={THEME.colors.info} />
            <Text style={styles.cardTitle}>Today's Logs</Text>
          </View>

          {todayAttendance ? (
            <View style={styles.logContainer}>
              <View style={styles.logItem}>
                <Text style={styles.logLabel}>Check-in</Text>
                <Text style={styles.logValue}>
                  {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {todayAttendance.check_out_time && (
                <View style={[styles.logItem, { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 12 }]}>
                  <Text style={styles.logLabel}>Check-out</Text>
                  <Text style={styles.logValue}>
                    {new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyLog}>
              <Ionicons name="calendar-outline" size={32} color={THEME.colors.text.muted} />
              <Text style={styles.emptyLogText}>No logs recorded for today yet.</Text>
            </View>
          )}
        </ModernCard>

        <View style={styles.actions}>
          {!todayAttendance && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: withinRange ? THEME.colors.primary : THEME.colors.text.muted }]}
              onPress={handleCheckIn}
              disabled={loading || fetchingLocation || !withinRange}
            >
              {loading ? <ActivityIndicator color="white" /> : (
                <>
                  <Ionicons name="enter" size={24} color="white" />
                  <Text style={styles.actionBtnText}>CHECK IN NOW</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {todayAttendance && !todayAttendance.check_out_time && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: THEME.colors.error }]}
              onPress={handleCheckOut}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="white" /> : (
                <>
                  <Ionicons name="exit" size={24} color="white" />
                  <Text style={styles.actionBtnText}>CHECK OUT NOW</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {todayAttendance?.check_out_time && (
            <View style={styles.doneContainer}>
              <Ionicons name="checkmark-circle" size={48} color={THEME.colors.success} />
              <Text style={styles.doneText}>Workday Completed</Text>
              <Text style={styles.doneSub}>See you tomorrow!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
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
  refreshBtn: { padding: 8, borderRadius: 12, backgroundColor: THEME.colors.primary + '10' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.colors.text.primary },
  scrollContent: { padding: THEME.spacing.lg },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.error + '10',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20
  },
  errorText: { color: THEME.colors.error, fontSize: 13, fontWeight: '600' },
  card: { padding: 20, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: THEME.colors.text.primary },
  locLoading: { alignItems: 'center', paddingVertical: 10 },
  locLoadingText: { marginTop: 8, color: THEME.colors.text.muted, fontSize: 12 },
  locInfo: { gap: 12 },
  locRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locLabel: { fontSize: 13, color: THEME.colors.text.muted, fontWeight: '500' },
  locValue: { fontSize: 14, fontWeight: 'bold', color: THEME.colors.text.primary },
  emptyText: { textAlign: 'center', color: THEME.colors.text.muted, fontSize: 14 },
  statusCard: { padding: 16, marginBottom: 20 },
  rangeHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rangeTitle: { fontSize: 18, fontWeight: 'bold' },
  rangeSub: { fontSize: 12, color: THEME.colors.text.secondary, marginTop: 2 },
  rangeSuccess: { backgroundColor: THEME.colors.success + '10', borderColor: THEME.colors.success + '30', borderWidth: 1 },
  rangeDanger: { backgroundColor: THEME.colors.error + '10', borderColor: THEME.colors.error + '30', borderWidth: 1 },
  logContainer: { paddingVertical: 4 },
  logItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logLabel: { fontSize: 14, color: THEME.colors.text.secondary, fontWeight: '500' },
  logValue: { fontSize: 20, fontWeight: 'bold', color: THEME.colors.text.primary },
  emptyLog: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  emptyLogText: { color: THEME.colors.text.muted, fontSize: 13 },
  actions: { marginTop: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },
  doneContainer: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  doneText: { fontSize: 22, fontWeight: 'bold', color: THEME.colors.text.primary },
  doneSub: { fontSize: 14, color: THEME.colors.text.secondary }
});
