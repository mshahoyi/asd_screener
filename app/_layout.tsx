import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="create-participant" options={{ title: 'Create Participant' }} />
      <Stack.Screen name="[participant]" options={{ headerShown: false }} />
    </Stack>
  );
}