import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(researcher)';

    if (session && !inAuthGroup) {
      router.replace('/(researcher)/dashboard');
    } else if (!session && inAuthGroup) {
      router.replace('/login');
    }
  }, [session, loading, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="(researcher)" options={{ headerShown: false }} />
    </Stack>
  );
}
