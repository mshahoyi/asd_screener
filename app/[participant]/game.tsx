import { useMachine } from '@xstate/react';
import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { gameMachine } from '../../scripts/game';

export default function GameScreen() {
  const router = useRouter();
  const [state] = useMachine(gameMachine);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Game Screen</Text>
      <Text>Difficulty: {state.context.difficultyLevel}</Text>
      <Button title="End Session" onPress={() => router.back()} />
    </View>
  );
}
