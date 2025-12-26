import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/services/supabase';
import { useRouter } from 'expo-router';

type Profile = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    company_id: string;
};

type Company = {
    id: string;
    name: string;
};

export default function Dashboard() {
    const { signOut, user } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadUserData();
    }, [user]);

    async function loadUserData() {
        if (!user) {
            console.log('Dashboard - No user');
            setLoading(false);
            return;
        }

        console.log('Dashboard - Loading data for user:', user.id);
        console.log('Dashboard - User email:', user.email);

        try {
            // Load profile
            console.log('Dashboard - Fetching profile...');
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            console.log('Dashboard - Profile query result:', { profileData, profileError });

            if (profileError) {
                console.error('Dashboard - Profile error:', profileError);
                setError(`Profile error: ${profileError.message} (Code: ${profileError.code})`);

                if (profileError.code === 'PGRST116') {
                    setError('Profile not found. Your account may not be set up correctly.');
                }

                setLoading(false);
                return;
            }

            if (!profileData) {
                setError('No profile data returned');
                setLoading(false);
                return;
            }

            setProfile(profileData);
            console.log('Dashboard - Profile loaded successfully:', profileData);

            // Load company
            if (profileData?.company_id) {
                console.log('Dashboard - Fetching company:', profileData.company_id);
                const { data: companyData, error: companyError } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', profileData.company_id)
                    .single();

                console.log('Dashboard - Company query result:', { companyData, companyError });

                if (companyError) {
                    console.error('Dashboard - Company error:', companyError);
                    // Don't fail completely if company fetch fails
                    setError(`Company error: ${companyError.message}`);
                } else {
                    setCompany(companyData);
                    console.log('Dashboard - Company loaded successfully:', companyData);
                }
            }
        } catch (error: any) {
            console.error('Dashboard - Unexpected error:', error);
            setError(`Unexpected error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.loadingText}>Loading dashboard...</Text>
                <Text style={styles.hintText}>Check console for details</Text>
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>⚠️ Error Loading Dashboard</Text>
                    <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
                    <Text style={styles.errorHint}>
                        Possible causes:
                    </Text>
                    <Text style={styles.errorDetail}>• Profile not created in database</Text>
                    <Text style={styles.errorDetail}>• RLS policies blocking access</Text>
                    <Text style={styles.errorDetail}>• User ID mismatch</Text>
                    <Text style={styles.errorHint}>
                        User ID: {user?.id}
                    </Text>
                    <Text style={styles.errorHint}>
                        Email: {user?.email}
                    </Text>
                    <View style={styles.buttonSpacing}>
                        <Button title="Retry" onPress={loadUserData} />
                    </View>
                    <Button title="Sign Out" onPress={signOut} color="#f44336" />
                </View>
            </View>
        );
    }

    console.log('Dashboard - Rendering with profile:', profile);
    console.log('Dashboard - Role:', profile.role);

    const isAdmin = profile.role === 'admin' || profile.role === 'ceo';
    const isManager = profile.role === 'manager';
    const isHR = profile.role === 'hr';
    const isFinance = profile.role === 'finance';

    console.log('Dashboard - Permissions:', { isAdmin, isManager, isHR, isFinance });

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome to Nexus</Text>
                <Text style={styles.subtitle}>{company?.name || 'Loading company...'}</Text>
            </View>

            <View style={styles.profileCard}>
                <Text style={styles.profileName}>
                    {profile.first_name} {profile.last_name}
                </Text>
                <Text style={styles.profileEmail}>{profile.email}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{profile.role.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                {/* Employee Actions */}
                <View style={styles.actionCard}>
                    <Text style={styles.actionTitle}>📍 Check In</Text>
                    <Text style={styles.actionDescription}>Record your attendance</Text>
                    <Button title="Check In Now" onPress={() => router.push('/(app)/check-in')} />
                </View>

                <View style={styles.actionCard}>
                    <Text style={styles.actionTitle}>🏖️ Request Leave</Text>
                    <Text style={styles.actionDescription}>Submit a leave request</Text>
                    <Button title="Request Leave" onPress={() => router.push('/(app)/leave')} />
                </View>

                {/* Admin/HR Attendance Overview */}
                {(isAdmin || isHR) && (
                    <View style={styles.actionCard}>
                        <Text style={styles.actionTitle}>📊 Attendance Overview</Text>
                        <Text style={styles.actionDescription}>View who is present/absent today</Text>
                        <Button title="View Report" onPress={() => router.push('/(app)/attendance-report')} />
                    </View>
                )}

                <View style={styles.actionCard}>
                    <Text style={styles.actionTitle}>💰 View Payslips</Text>
                    <Text style={styles.actionDescription}>Download your payslips</Text>
                    <Button title="View Payslips" onPress={() => router.push('/(app)/payslips')} />
                </View>

                {/* Manager/Admin Actions */}
                {(isAdmin || isManager || isHR) && (
                    <>
                        <Text style={styles.sectionTitle}>Management</Text>

                        {isAdmin && (
                            <View style={styles.actionCard}>
                                <Text style={styles.actionTitle}>👥 Manage Employees</Text>
                                <Text style={styles.actionDescription}>Invite and manage team members</Text>
                                <Button title="Manage Employees" onPress={() => router.push('/(app)/employees')} />
                            </View>
                        )}

                        {isAdmin && (
                            <View style={styles.actionCard}>
                                <Text style={styles.actionTitle}>⚙️ Company Settings</Text>
                                <Text style={styles.actionDescription}>Set office location and radius</Text>
                                <Button title="Settings" onPress={() => router.push('/(app)/settings')} />
                            </View>
                        )}

                        {(isAdmin || isManager) && (
                            <View style={styles.actionCard}>
                                <Text style={styles.actionTitle}>🏢 Manage Departments</Text>
                                <Text style={styles.actionDescription}>Create and organize departments</Text>
                                <Button title="Manage Departments" onPress={() => router.push('/(app)/teams')} />
                            </View>
                        )}

                        {(isAdmin || isManager || isHR) && (
                            <View style={styles.actionCard}>
                                <Text style={styles.actionTitle}>✅ Approve Requests</Text>
                                <Text style={styles.actionDescription}>Review pending leave requests</Text>
                                <Button title="View Requests" onPress={() => router.push('/(app)/approvals')} />
                            </View>
                        )}
                    </>
                )}

                {/* Finance Actions */}
                {(isAdmin || isFinance) && (
                    <>
                        <Text style={styles.sectionTitle}>Finance</Text>
                        <View style={styles.actionCard}>
                            <Text style={styles.actionTitle}>💵 Manage Payroll</Text>
                            <Text style={styles.actionDescription}>Process and publish payroll</Text>
                            <Button title="Manage Payroll" onPress={() => router.push('/(app)/payroll')} />
                        </View>
                    </>
                )}
            </View>

            <View style={styles.footer}>
                <Button title="Sign Out" onPress={signOut} color="#f44336" />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        fontSize: 18,
        marginBottom: 8,
    },
    hintText: {
        fontSize: 14,
        color: '#666',
    },
    errorContainer: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 12,
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#f44336',
    },
    errorText: {
        fontSize: 16,
        marginBottom: 16,
        color: '#333',
    },
    errorHint: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 4,
        color: '#666',
    },
    errorDetail: {
        fontSize: 13,
        marginLeft: 8,
        marginBottom: 2,
        color: '#666',
    },
    buttonSpacing: {
        marginTop: 16,
        marginBottom: 8,
    },
    header: {
        backgroundColor: '#2196f3',
        padding: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
    profileCard: {
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
    profileName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    roleBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    roleText: {
        color: '#1976d2',
        fontSize: 12,
        fontWeight: '600',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 8,
    },
    actionCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    footer: {
        padding: 16,
        paddingBottom: 32,
    },
});
