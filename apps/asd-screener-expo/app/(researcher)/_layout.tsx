import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Text } from 'react-native';

export default function ResearcherLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}
