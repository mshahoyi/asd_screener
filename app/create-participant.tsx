import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function CreateParticipant() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Create Participant Screen</Text>
      <Button title="Save" onPress={() => router.back()} />
    </View>
  );
}
