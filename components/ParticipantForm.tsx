import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';

export type ParticipantFormData = {
  anonymousId: string;
  age: string;
  gender: string;
};

type ParticipantFormProps = {
  onSubmit: (data: ParticipantFormData) => void;
  initialValues?: ParticipantFormData;
  buttonText?: string;
};

export default function ParticipantForm({
  onSubmit,
  initialValues = { anonymousId: '', age: '', gender: '' },
  buttonText = 'Save',
}: ParticipantFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: initialValues });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        rules={{ required: 'Anonymous ID is required.' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Anonymous ID"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            style={styles.input}
            error={!!errors.anonymousId}
          />
        )}
        name="anonymousId"
      />
      {errors.anonymousId && <Text style={styles.errorText}>{errors.anonymousId.message}</Text>}

      <Controller
        control={control}
        rules={{ required: 'Age is required.', pattern: { value: /^\d+$/, message: 'Age must be a number.' } }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Age"
            onBlur={onBlur}
            onChangeText={onChange}
            value={String(value)}
            keyboardType="numeric"
            style={styles.input}
            error={!!errors.age}
          />
        )}
        name="age"
      />
      {errors.age && <Text style={styles.errorText}>{errors.age.message}</Text>}

      <Controller
        control={control}
        rules={{ required: 'Gender is required.' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Gender"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            style={styles.input}
            error={!!errors.gender}
          />
        )}
        name="gender"
      />
      {errors.gender && <Text style={styles.errorText}>{errors.gender.message}</Text>}

      <Button mode="contained" onPress={handleSubmit(onSubmit)} style={styles.button}>
        {buttonText}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
  },
});
