import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getParticipants, NewParticipant, Participant } from '@/db/controller';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

export default function ResearcherDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
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

  const renderItem = ({ item }: { item: Participant }) => (
    <Card style={styles.card} onPress={() => router.push(`/${item.id}/`)}>
      <Card.Title title={`Participant: ${item.anonymousId}`} />
      <Card.Content>
        <Text>Age: {item.age}</Text>
        <Text>Gender: {item.gender}</Text>
        <Text>Created At: {item.createdAt.toLocaleString()}</Text>
      </Card.Content>
      <Card.Actions>
        <Button mode="contained" onPress={() => router.push(`/${item.id}/game`)}>
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
          columnWrapperStyle={{ backgroundColor: 'orange', gap: 12 }}
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
    backgroundColor: 'red',
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
