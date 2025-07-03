import { Button, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Researcher Dashboard</Text>
      <Button title="Logout" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
