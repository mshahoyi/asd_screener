import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getParticipants, NewParticipant, Participant, ParticipantWithCounts, startGame } from '@/db/controller';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { exportData } from '@/scripts/exportController';
import { useUpdates } from 'expo-updates';

export default function ResearcherDashboard() {
  const [participants, setParticipants] = useState<ParticipantWithCounts[]>([]);
  const router = useRouter();
  const { currentlyRunning } = useUpdates();

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
        <Button mode="outlined" onPress={() => exportData(item.id)}>
          Export
        </Button>

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
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => exportData()} style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="share-outline" size={24} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/create-participant')}
                style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="add" size={24} />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={participants}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text>No participants found</Text>}
          ListFooterComponent={() => (
            <Text variant="bodySmall" style={styles.version}>
              version: {currentlyRunning?.updateId?.slice(-8) || 'dev'}
            </Text>
          )}
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
  version: {
    textAlign: 'center',
    opacity: 0.6,
    paddingBottom: 12,
    paddingTop: 8,
  },
});
