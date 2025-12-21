import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function Dashboard() {
    const { signOut, user } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Welcome to Nexus</Text>
            <Text style={styles.subtext}>User: {user?.email}</Text>
            <Button title="Sign Out" onPress={signOut} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    subtext: {
        marginBottom: 20,
        color: '#666',
    },
});
