import { Stack } from 'expo-router';

export default function AppLayout() {
    return (
        <Stack>
            <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
            <Stack.Screen name="check-in" options={{ title: 'Check In' }} />
            <Stack.Screen name="leave" options={{ title: 'Leave Requests' }} />
            <Stack.Screen name="employees" options={{ title: 'Employees' }} />
            <Stack.Screen name="payslips" options={{ title: 'Payslips' }} />
            <Stack.Screen name="approvals" options={{ title: 'Leave Approvals' }} />
            <Stack.Screen name="teams" options={{ title: 'Teams' }} />
            <Stack.Screen name="payroll" options={{ title: 'Payroll' }} />
            <Stack.Screen name="my-department/index" options={{ title: 'My Department' }} />
        </Stack>
    );
}
