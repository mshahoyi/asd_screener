import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { createParticipant } from '@/db/controller';
import ParticipantForm, { ParticipantFormData } from '@/components/ParticipantForm';
import { nanoid } from 'nanoid/non-secure';

export default function CreateParticipantScreen() {
  const router = useRouter();

  const onSubmit = (data: ParticipantFormData) => {
    createParticipant({
      anonymousId: data.anonymousId || `P_${nanoid(6)}`,
      age: parseInt(data.age, 10),
      gender: data.gender,
      condition: data.condition,
      note: data.note,
    })
      .then((result) => {
        router.replace({
          pathname: '/[participant]',
          params: {
            participant: result[0].id.toString(),
          },
        });
      })
      .catch((error) => {
        console.error('Error creating participant', error);
        alert(error.message);
      });
  };

  return (
    <View style={styles.container}>
      <ParticipantForm onSubmit={onSubmit} buttonText="Create Participant" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
