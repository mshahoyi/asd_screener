import '@/scripts/eventRecorder';
import { Stack } from 'expo-router';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { db } from '@/db/index';

export default function RootLayout() {
  if (__DEV__) {
    // @ts-ignore
    useDrizzleStudio(db);
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="create-participant" options={{ title: 'Create Participant' }} />
      <Stack.Screen name="[participant]" options={{ headerShown: false }} />
    </Stack>
  );
}
