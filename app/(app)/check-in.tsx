import { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { useAuth } from '../../src/context/AuthContext';
import * as Location from 'expo-location';

export default function CheckIn() {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Failed to get location');
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
        .eq('date', today)
        .maybeSingle();

      if (error) {
        throw error;
      }

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
        // No office location set, allow check-in
        setWithinRange(true);
      }
    } catch (error) {
      console.error('Error checking distance:', error);
    }
  }

  async function handleCheckIn() {
    if (!location) {
      const msg = 'Location not available. Please enable location services.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }

    if (!withinRange) {
      const distance = distanceToOffice ? Math.round(distanceToOffice) : 0;
      const msg = `You are ${distance}m from the office. You must be within ${officeRadius}m to check in.`;
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Out of Range', msg);
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Company not found');
      }

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

      const msg = 'Checked in successfully!';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

      loadTodayAttendance();
    } catch (error: any) {
      const msg = error.message || 'Failed to check in';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
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

      const msg = 'Checked out successfully!';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);

      loadTodayAttendance();
    } catch (error: any) {
      const msg = error.message || 'Failed to check out';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Check-In</Text>
      </View>

      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Your Location</Text>
        {location ? (
          <View>
            <Text style={styles.locationText}>
              Latitude: {location.coords.latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Longitude: {location.coords.longitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Accuracy: ±{location.coords.accuracy?.toFixed(0)}m
            </Text>
          </View>
        ) : (
          <Text style={styles.locationText}>Getting location...</Text>
        )}
      </View>

      {distanceToOffice !== null && (
        <View style={[styles.card, withinRange ? styles.successCard : styles.warningCard]}>
          <Text style={styles.cardTitle}>🏢 Office Distance</Text>
          <Text style={styles.distanceText}>
            {Math.round(distanceToOffice)}m from office
          </Text>
          <Text style={styles.rangeText}>
            {withinRange ? '✓ Within check-in range' : `✗ Must be within ${officeRadius}m`}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        {todayAttendance ? (
          <View>
            <Text style={styles.statusText}>Status: {todayAttendance.status}</Text>
            <Text style={styles.timeText}>
              Check-in: {new Date(todayAttendance.check_in_time).toLocaleTimeString()}
            </Text>
            {todayAttendance.check_out_time && (
              <Text style={styles.timeText}>
                Check-out: {new Date(todayAttendance.check_out_time).toLocaleTimeString()}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.statusText}>Not checked in yet</Text>
        )}
      </View>

      <View style={styles.actions}>
        {!todayAttendance && (
          <Button
            title={loading ? "Checking in..." : "Check In"}
            onPress={handleCheckIn}
            disabled={loading || !location || !withinRange}
          />
        )}

        {todayAttendance && !todayAttendance.check_out_time && (
          <Button
            title={loading ? "Checking out..." : "Check Out"}
            onPress={handleCheckOut}
            disabled={loading || !location}
            color="#f44336"
          />
        )}

        {todayAttendance?.check_out_time && (
          <Text style={styles.completedText}>✅ Attendance completed for today</Text>
        )}
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
    backgroundColor: '#2196f3',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actions: {
    padding: 16,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4caf50',
    textAlign: 'center',
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    backgroundColor: '#fff3e0',
  },
  distanceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  rangeText: {
    fontSize: 14,
    color: '#666',
  },
});
