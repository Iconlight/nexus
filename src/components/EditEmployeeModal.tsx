import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { THEME } from '../constants/Theme';
import { ModernCard } from './ModernCard';
import { Ionicons } from '@expo/vector-icons';

type Department = {
    id: string;
    name: string;
};

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    team_id?: string;
    gender?: string;
    base_salary?: number;
};

type EditEmployeeModalProps = {
    visible: boolean;
    onClose: () => void;
    employee: Employee | null;
    departments: Department[];
    onUpdate: (updates: any) => Promise<void>;
};

export default function EditEmployeeModal({ visible, onClose, employee, departments, onUpdate }: EditEmployeeModalProps) {
    const [role, setRole] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [gender, setGender] = useState('');
    const [baseSalary, setBaseSalary] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (employee) {
            setRole(employee.role || 'employee');
            setDepartmentId(employee.team_id || '');
            setGender(employee.gender || '');
            setBaseSalary(employee.base_salary?.toString() || '');
        }
    }, [employee]);

    const handleSave = async () => {
        setUpdating(true);
        try {
            await onUpdate({
                role,
                team_id: departmentId || null,
                gender: gender || null,
                base_salary: baseSalary ? parseFloat(baseSalary) : null
            });
            onClose();
        } catch (error) {
            console.error('Update error:', error);
        } finally {
            setUpdating(false);
        }
    };

    if (!employee) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.formTitle}>Edit Employee</Text>
                            <Text style={styles.modalSubtitle}>
                                {employee.first_name} {employee.last_name}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={24} color={THEME.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Role Selection */}
                        <Text style={styles.label}>System Role</Text>
                        <View style={styles.tagGroup}>
                            {['employee', 'manager', 'hr', 'finance', 'admin'].map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[
                                        styles.tag,
                                        role === r && styles.tagActive
                                    ]}
                                    onPress={() => setRole(r)}
                                >
                                    <Text style={[
                                        styles.tagText,
                                        role === r && styles.tagTextActive
                                    ]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Department Selection */}
                        <Text style={styles.label}>Department</Text>
                        <View style={styles.tagGroup}>
                            <TouchableOpacity
                                style={[
                                    styles.tag,
                                    departmentId === '' && styles.tagActive
                                ]}
                                onPress={() => setDepartmentId('')}
                            >
                                <Text style={[
                                    styles.tagText,
                                    departmentId === '' && styles.tagTextActive
                                ]}>None</Text>
                            </TouchableOpacity>
                            {departments.map((dept) => (
                                <TouchableOpacity
                                    key={dept.id}
                                    style={[
                                        styles.tag,
                                        departmentId === dept.id && styles.tagActive
                                    ]}
                                    onPress={() => setDepartmentId(dept.id)}
                                >
                                    <Text style={[
                                        styles.tagText,
                                        departmentId === dept.id && styles.tagTextActive
                                    ]}>{dept.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Gender Selection */}
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.tagGroup}>
                            {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.tag,
                                        gender === g && styles.tagActive
                                    ]}
                                    onPress={() => setGender(g)}
                                >
                                    <Text style={[
                                        styles.tagText,
                                        gender === g && styles.tagTextActive
                                    ]}>{g.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Salary Input */}
                        <Text style={styles.label}>Base Salary (Monthly)</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.currencyPrefix}>$</Text>
                            <TextInput
                                style={styles.input}
                                value={baseSalary}
                                onChangeText={setBaseSalary}
                                placeholder="0.00"
                                keyboardType="numeric"
                                placeholderTextColor={THEME.colors.text.muted}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSave}
                            disabled={updating}
                        >
                            {updating ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                                    <Text style={styles.saveBtnText}>Save Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    formTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: THEME.colors.text.primary,
    },
    modalSubtitle: {
        fontSize: 14,
        color: THEME.colors.text.muted,
        marginTop: 4,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: THEME.colors.text.secondary,
        marginBottom: 12,
        marginTop: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tagGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    tag: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#f0f2f5',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tagActive: {
        backgroundColor: THEME.colors.primary + '15',
        borderColor: THEME.colors.primary,
    },
    tagText: {
        fontSize: 13,
        color: THEME.colors.text.secondary,
        fontWeight: '500',
    },
    tagTextActive: {
        color: THEME.colors.primary,
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: THEME.colors.border,
    },
    currencyPrefix: {
        fontSize: 16,
        fontWeight: 'bold',
        color: THEME.colors.text.secondary,
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: THEME.colors.text.primary,
        fontWeight: '600',
    },
    saveBtn: {
        backgroundColor: THEME.colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        marginTop: 32,
        gap: 8,
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
