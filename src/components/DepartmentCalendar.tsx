import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Button, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/Theme';

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
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

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
                marks[act.date] = { marked: true, dotColor: theme.colors.primary };
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
                    [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: theme.colors.primary }
                }}
                theme={{
                    backgroundColor: theme.colors.card,
                    calendarBackground: theme.colors.card,
                    textSectionTitleColor: theme.colors.text.secondary,
                    selectedDayBackgroundColor: theme.colors.primary,
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: theme.colors.primary,
                    dayTextColor: theme.colors.text.primary,
                    textDisabledColor: theme.colors.text.muted,
                    dotColor: theme.colors.primary,
                    selectedDotColor: '#ffffff',
                    arrowColor: theme.colors.primary,
                    monthTextColor: theme.colors.text.primary,
                    indicatorColor: theme.colors.primary,
                }}
            />

            <View style={styles.activitySection}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>
                        {selectedDate ? `Activities for ${selectedDate}` : 'Select a date'}
                    </Text>
                    {!!selectedDate && (
                        <Button title="Add Activity" color={theme.colors.primary} onPress={() => setModalVisible(true)} />
                    )}
                </View>

                <ScrollView>
                    {selectedDayActivities.length === 0 ? (
                        <Text style={styles.emptyText}>No activities scheduled.</Text>
                    ) : (
                        selectedDayActivities.map(act => (
                            <View key={act.id} style={styles.card}>
                                <Text style={styles.cardTitle}>{act.title}</Text>
                                {!!act.description && <Text style={styles.cardDesc}>{act.description}</Text>}
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={styles.modalTitle}>New Activity ({selectedDate})</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Title"
                            placeholderTextColor={theme.colors.text.muted}
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />

                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Description"
                            placeholderTextColor={theme.colors.text.muted}
                            value={newDesc}
                            onChangeText={setNewDesc}
                            multiline
                        />

                        <View style={styles.modalButtons}>
                            <Button title={creating ? "Saving..." : "Save"} color={theme.colors.primary} onPress={createActivity} disabled={creating} />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (theme: typeof THEME) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        color: theme.colors.text.primary,
    },
    emptyText: {
        color: theme.colors.text.muted,
        fontStyle: 'italic',
        marginTop: 20,
        textAlign: 'center',
    },
    card: {
        backgroundColor: theme.colors.card,
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
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
        color: theme.colors.text.primary,
    },
    cardDesc: {
        color: theme.colors.text.secondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    input: {
        backgroundColor: theme.colors.background,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 16,
        color: theme.colors.text.primary,
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
