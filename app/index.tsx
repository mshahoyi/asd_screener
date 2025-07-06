import { View, Text, Button } from 'react-native';
import { Link } from 'expo-router';

export default function ResearcherDashboard() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Researcher Dashboard</Text>
      <Link href="/create-participant" asChild>
        <Button title="Create New Participant" />
      </Link>
      {/* This will be replaced by a list of participants */}
      <Link href="/participant123" asChild>
        <Button title="Go to Participant 123" />
      </Link>
    </View>
  );
}
