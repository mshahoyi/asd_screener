import { Tabs } from 'expo-router';

export default function AppLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="(game)"
        options={{
          title: 'Game',
        }}
      />
      <Tabs.Screen
        name="(researcher)"
        options={{
          title: 'Researcher',
        }}
      />
    </Tabs>
  );
}
