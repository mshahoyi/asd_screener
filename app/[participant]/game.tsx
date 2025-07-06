import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function GameScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Game Screen</Text>
      <Button title="End Session" onPress={() => router.back()} />
    </View>
  );
}
