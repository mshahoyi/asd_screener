import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, TextInput, Button, Text, Card, Title } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { getSettings, saveSettings, AppSettings } from '@/scripts/settingsController';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AppSettings>();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await getSettings();
      Object.keys(settings).forEach((key) => {
        setValue(key as keyof AppSettings, settings[key as keyof AppSettings]);
      });
    } catch (error) {
      alert(error);
    }
  }, [setValue]);

  const onSubmit = async (data: AppSettings) => {
    try {
      await saveSettings(data);
      router.back();
    } catch (error) {
      alert(error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Card.Content>
            <Text variant="titleLarge" style={{ marginBottom: 16 }}>
              Timeouts
            </Text>

            <Controller
              control={control}
              name="sessionTimeLimit"
              rules={{ required: true, pattern: /^\d+$/ }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Session Time Limit (seconds)"
                  value={value?.toString()}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  style={styles.input}
                  error={!!errors.sessionTimeLimit}
                />
              )}
            />
            <Controller
              control={control}
              name="cl1Timeout"
              rules={{ required: true, pattern: /^\d+$/ }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Cue Level 1 Timeout (seconds)"
                  value={value?.toString()}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  style={styles.input}
                  error={!!errors.cl1Timeout}
                />
              )}
            />
            <Controller
              control={control}
              name="cl2Timeout"
              rules={{ required: true, pattern: /^\d+$/ }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Cue Level 2 Timeout (seconds)"
                  value={value?.toString()}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  style={styles.input}
                  error={!!errors.cl2Timeout}
                />
              )}
            />
            <Controller
              control={control}
              name="cl3Timeout"
              rules={{ required: true, pattern: /^\d+$/ }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Cue Level 3 Timeout (seconds)"
                  value={value?.toString()}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  style={styles.input}
                  error={!!errors.cl3Timeout}
                />
              )}
            />
            <Controller
              control={control}
              name="cl4Timeout"
              rules={{ required: true, pattern: /^\d+$/ }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Cue Level 4 Timeout (seconds)"
                  value={value?.toString()}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  style={styles.input}
                  error={!!errors.cl4Timeout}
                />
              )}
            />
          </Card.Content>
        </Card>
        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={styles.button}>
          Save Settings
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
});
