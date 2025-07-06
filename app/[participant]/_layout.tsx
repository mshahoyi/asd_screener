import { Stack } from 'expo-router';

export default function ParticipantLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Participant Details' }} />
      <Stack.Screen name="game" options={{ title: 'Game' }} />
    </Stack>
  );
}
