import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Button, Alert, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type Activity = {
    id: string;
    title: string;
    description: string;
    date: string;
    created_by: string;
};

type DepartmentCalendarProps = {
    teamId: string;
};

export default function DepartmentCalendar({ teamId }: DepartmentCalendarProps) {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState('');
    const [activities, setActivities] = useState<Activity[]>([]);
    const [markedDates, setMarkedDates] = useState<any>({});
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (teamId) {
            loadActivities();
        }
    }, [teamId]);

    async function loadActivities() {
        try {
            const { data, error } = await supabase
                .from('department_activities')
                .select('*')
                .eq('team_id', teamId);

            if (error) throw error;

            setActivities(data || []);

            // Mark dates
            const marks: any = {};
            data?.forEach(act => {
                marks[act.date] = { marked: true, dotColor: '#2196f3' };
            });
            setMarkedDates(marks);

        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setLoading(false);
        }
    }

    async function createActivity() {
        if (!newTitle || !selectedDate || !teamId) return;
        setCreating(true);

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.company_id) throw new Error('Company not found');

            const { error } = await supabase
                .from('department_activities')
                .insert({
                    company_id: profile.company_id,
                    team_id: teamId,
                    title: newTitle,
                    description: newDesc,
                    date: selectedDate,
                    created_by: user?.id
                });

            if (error) throw error;

            Alert.alert('Success', 'Activity created');
            setModalVisible(false);
            setNewTitle('');
            setNewDesc('');
            loadActivities();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setCreating(false);
        }
    }

    const selectedDayActivities = activities.filter(a => a.date === selectedDate);

    return (
        <View style={styles.container}>
            <Calendar
                onDayPress={(day: any) => {
                    setSelectedDate(day.dateString);
                }}
                markedDates={{
                    ...markedDates,
                    [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: '#2196f3' }
                }}
                theme={{
                    todayTextColor: '#2196f3',
                    selectedDayBackgroundColor: '#2196f3',
                }}
            />

            <View style={styles.activitySection}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>
                        {selectedDate ? `Activities for ${selectedDate}` : 'Select a date'}
                    </Text>
                    {selectedDate && (
                        <Button title="Add Activity" onPress={() => setModalVisible(true)} />
                    )}
                </View>

                <ScrollView>
                    {selectedDayActivities.length === 0 ? (
                        <Text style={styles.emptyText}>No activities scheduled.</Text>
                    ) : (
                        selectedDayActivities.map(act => (
                            <View key={act.id} style={styles.card}>
                                <Text style={styles.cardTitle}>{act.title}</Text>
                                {act.description && <Text style={styles.cardDesc}>{act.description}</Text>}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Activity ({selectedDate})</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Title"
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />

                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Description"
                            value={newDesc}
                            onChangeText={setNewDesc}
                            multiline
                        />

                        <View style={styles.modalButtons}>
                            <Button title="Cancel" onPress={() => setModalVisible(false)} color="#999" />
                            <Button title={creating ? "Saving..." : "Save"} onPress={createActivity} disabled={creating} />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    activitySection: {
        flex: 1,
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
        marginTop: 20,
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardDesc: {
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
});
