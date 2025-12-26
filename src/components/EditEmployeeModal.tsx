import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Button, TextInput, ScrollView, Platform, Alert } from 'react-native';

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
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView>
                        <Text style={styles.formTitle}>Edit Employee</Text>
                        <Text style={styles.modalSubtitle}>
                            {employee.first_name} {employee.last_name}
                        </Text>

                        {/* Role Selection */}
                        <Text style={styles.label}>Role:</Text>
                        <View style={styles.roleButtons}>
                            {['employee', 'manager', 'hr', 'finance', 'admin'].map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[
                                        styles.roleButton,
                                        role === r && styles.roleButtonActive
                                    ]}
                                    onPress={() => setRole(r)}
                                >
                                    <Text style={[
                                        styles.roleButtonText,
                                        role === r && styles.roleButtonTextActive
                                    ]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Department Selection */}
                        <Text style={styles.label}>Department:</Text>
                        <View style={styles.roleButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    departmentId === '' && styles.roleButtonActive
                                ]}
                                onPress={() => setDepartmentId('')}
                            >
                                <Text style={[
                                    styles.roleButtonText,
                                    departmentId === '' && styles.roleButtonTextActive
                                ]}>None</Text>
                            </TouchableOpacity>
                            {departments.map((dept) => (
                                <TouchableOpacity
                                    key={dept.id}
                                    style={[
                                        styles.roleButton,
                                        departmentId === dept.id && styles.roleButtonActive
                                    ]}
                                    onPress={() => setDepartmentId(dept.id)}
                                >
                                    <Text style={[
                                        styles.roleButtonText,
                                        departmentId === dept.id && styles.roleButtonTextActive
                                    ]}>{dept.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Gender Selection */}
                        <Text style={styles.label}>Gender:</Text>
                        <View style={styles.roleButtons}>
                            {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.roleButton,
                                        gender === g && styles.roleButtonActive
                                    ]}
                                    onPress={() => setGender(g)}
                                >
                                    <Text style={[
                                        styles.roleButtonText,
                                        gender === g && styles.roleButtonTextActive
                                    ]}>{g.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Salary Input */}
                        <Text style={styles.label}>Base Salary:</Text>
                        <TextInput
                            style={styles.input}
                            value={baseSalary}
                            onChangeText={setBaseSalary}
                            placeholder="Enter base salary"
                            keyboardType="numeric"
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                onPress={onClose}
                                color="#999"
                            />
                            <Button
                                title={updating ? "Updating..." : "Save Changes"}
                                onPress={handleSave}
                                disabled={updating}
                            />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    roleButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    roleButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 4,
    },
    roleButtonActive: {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196f3',
    },
    roleButtonText: {
        fontSize: 12,
        color: '#666',
    },
    roleButtonTextActive: {
        color: '#1976d2',
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
    },
});
