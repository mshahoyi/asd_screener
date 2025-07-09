import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getParticipantById, updateParticipant, Participant } from '@/db/controller';
import ParticipantForm, { ParticipantFormData } from '@/components/ParticipantForm';
import { Ionicons } from '@expo/vector-icons';

export default function EditParticipantScreen() {
  const router = useRouter();
  const { participant: participantId } = useLocalSearchParams();
  const [participant, setParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    const loadParticipant = async () => {
      const id = parseInt(participantId as string, 10);
      const participantData = await getParticipantById(id);
      setParticipant(participantData);
    };
    loadParticipant();
  }, [participantId]);

  const onSubmit = async (data: ParticipantFormData) => {
    const id = parseInt(participantId as string, 10);
    await updateParticipant(id, {
      ...data,
      age: parseInt(data.age, 10),
    });
    router.back();
  };

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
          title: 'Edit Participant',
        }}
      />

      <View style={styles.container}>
        <ParticipantForm
          onSubmit={onSubmit}
          initialValues={{
            anonymousId: participant.anonymousId,
            age: String(participant.age),
            gender: participant.gender,
            condition: participant.condition || '',
            note: participant.note || '',
          }}
          buttonText="Update Participant"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
