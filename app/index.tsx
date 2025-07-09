import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getParticipants, NewParticipant, Participant, ParticipantWithCounts, startGame } from '@/db/controller';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

export default function ResearcherDashboard() {
  const [participants, setParticipants] = useState<ParticipantWithCounts[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = () => {
    getParticipants()
      .then((data) => {
        setParticipants(data);
      })
      .catch((error) => {
        console.error('Error loading participants', error);
        alert(error.message);
      });
  };

  useRefreshOnFocus(loadParticipants);

  const renderLabelValue = useCallback(
    (label: string, value: string | null) => (
      <Text>
        <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
          {label}:
        </Text>{' '}
        {value}
      </Text>
    ),
    []
  );

  const renderItem = ({ item }: { item: ParticipantWithCounts }) => (
    <Card style={styles.card} onPress={() => router.push(`/${item.id}/`)}>
      <Card.Title title={`Participant: ${item.anonymousId}`} />
      <Card.Content>
        {renderLabelValue('Gender', item.gender)}
        {renderLabelValue('Created At', item.createdAt.toLocaleString())}
        {renderLabelValue('Condition', item.condition ?? 'N/A')}
        {!!item.note && renderLabelValue('Note', item.note)}
        {renderLabelValue('Games', item.gameCount.toString())}
        {renderLabelValue('Events', item.eventCount.toString())}
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={() =>
            startGame(item.id)
              .then((game) => router.push(`/${item.id}/game/${game[0].id}`))
              .catch(alert)
          }
        >
          Start Game
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Participants',
          headerLeft: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="settings-outline" size={24} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/create-participant')}
              style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="add" size={24} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={participants}
          numColumns={2}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          columnWrapperStyle={{ gap: 12 }}
          ListEmptyComponent={<Text>No participants found</Text>}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
  },
  list: {
    padding: 12,
  },
  card: {
    marginVertical: 8,
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
