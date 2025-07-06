import { View, Text, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ParticipantDetails() {
  const router = useRouter();
  const { participant } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Participant Details: {participant}</Text>
      <Button title="Start New Session" onPress={() => router.push(`/${participant}/game`)} />
    </View>
  );
}
