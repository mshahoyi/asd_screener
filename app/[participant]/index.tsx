import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Appbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import {
  getParticipantById,
  getGamesForParticipant,
  getTrialCountForGame,
  getEventCountForGame,
  Participant,
  startGame,
} from '@/db/controller';
import { Ionicons } from '@expo/vector-icons';

type Game = {
  id: number;
  startedAt: Date;
  endedAt: Date | null;
  trialCount: number;
  eventCount: number;
};

export default function ParticipantDetails() {
  const router = useRouter();
  const { participant: participantId } = useLocalSearchParams<{ participant: string }>();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const id = parseInt(participantId as string, 10);

  const loadData = () => {
    Promise.all([getParticipantById(id), getGamesForParticipant(id)])
      .then(async ([participantData, gamesData]) => {
        setParticipant(participantData);

        const gamesWithCounts = await Promise.all(
          gamesData.map(async (game) => {
            const [trialCount, eventCount] = await Promise.all([getTrialCountForGame(game.id), getEventCountForGame(game.id)]);
            return { ...game, trialCount, eventCount };
          })
        );

        setGames(gamesWithCounts);
      })
      .catch((error) => {
        console.error(error);
        alert(error);
      });
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [participantId])
  );

  if (!participant) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Participant Details',
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/[participant]/edit',
                  params: {
                    participant: participantId,
                  },
                })
              }
              style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="pencil" size={24} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <Card.Content style={{ gap: 2 }}>
              <Text variant="titleLarge">Participant Information</Text>
              <Text variant="bodyMedium">
                <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                  Anonymous ID:
                </Text>{' '}
                {participant.anonymousId}
              </Text>
              <Text variant="bodyMedium">
                <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                  Age:
                </Text>{' '}
                {participant.age}
              </Text>
              <Text variant="bodyMedium">
                <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                  Gender:
                </Text>{' '}
                {participant.gender}
              </Text>
              <Text variant="bodyMedium">
                <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                  Condition:
                </Text>{' '}
                {participant.condition}
              </Text>
              <Text variant="bodyMedium">
                <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                  Note:
                </Text>{' '}
                {participant.note}
              </Text>
            </Card.Content>
          </Card>

          <Text variant="titleLarge" style={styles.title}>
            {games.length > 0 ? 'Game History' : 'No games yet'}
          </Text>

          <Button
            mode="contained"
            style={styles.button}
            onPress={() =>
              startGame(id)
                .then((game) => router.push(`/${participantId}/game/${game[0].id}`))
                .catch(alert)
            }
          >
            Start New Game
          </Button>

          {games.map((game) => (
            <Card key={game.id} style={styles.card}>
              <Card.Content>
                <Text variant="bodyMedium">
                  <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                    Game ID:
                  </Text>{' '}
                  {game.id}
                </Text>
                <Text variant="bodyMedium">
                  <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                    Started:
                  </Text>{' '}
                  {new Date(game.startedAt).toLocaleString()}
                </Text>
                <Text variant="bodyMedium">
                  <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                    Ended:
                  </Text>{' '}
                  {game.endedAt ? new Date(game.endedAt).toLocaleString() : 'In Progress'}
                </Text>
                <Text variant="bodyMedium">
                  <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                    Trials:
                  </Text>{' '}
                  {game.trialCount}
                </Text>
                <Text variant="bodyMedium">
                  <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                    Events:
                  </Text>{' '}
                  {game.eventCount}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginTop: 8,
  },
  button: {
    marginVertical: 16,
  },
});
