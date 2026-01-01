import { Stack } from 'expo-router';

export default function AppLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="check-in" />
            <Stack.Screen name="leave" />
            <Stack.Screen name="employees" />
            <Stack.Screen name="payslips" />
            <Stack.Screen name="approvals" />
            <Stack.Screen name="teams" />
            <Stack.Screen name="payroll" />
            <Stack.Screen name="my-department/index" />
            <Stack.Screen name="chat/index" />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="chat/new" />
            <Stack.Screen name="profile" />
        </Stack>
    );
}
