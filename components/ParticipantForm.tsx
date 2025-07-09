import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';

export type ParticipantFormData = {
  anonymousId: string;
  age: string;
  gender: string;
  condition: string;
  note: string;
};

type ParticipantFormProps = {
  onSubmit: (data: ParticipantFormData) => void;
  initialValues?: ParticipantFormData;
  buttonText?: string;
};

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export default function ParticipantForm({
  onSubmit,
  initialValues = { anonymousId: '', age: '', gender: '', condition: '', note: '' },
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
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Anonymous ID"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            style={styles.input}
            error={!!errors.anonymousId}
            placeholder="Leave blank to auto-generate"
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
        render={({ field: { onChange, value } }) => (
          <View style={styles.segmentedContainer}>
            <Text variant="labelMedium" style={styles.segmentedLabel}>
              Gender
            </Text>
            <SegmentedButtons value={value} onValueChange={onChange} buttons={genderOptions} style={styles.segmentedButtons} />
          </View>
        )}
        name="gender"
      />
      {errors.gender && <Text style={styles.errorText}>{errors.gender.message}</Text>}

      <Controller
        control={control}
        rules={{ required: 'Condition is required.' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Condition"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            style={styles.input}
            error={!!errors.condition}
          />
        )}
        name="condition"
      />
      {errors.condition && <Text style={styles.errorText}>{errors.condition.message}</Text>}

      <Controller
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            multiline
            label="Note"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            style={styles.input}
            error={!!errors.note}
          />
        )}
        name="note"
      />

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
  segmentedContainer: {
    marginBottom: 16,
  },
  segmentedLabel: {
    marginBottom: 8,
    marginLeft: 4,
  },
  segmentedButtons: {
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