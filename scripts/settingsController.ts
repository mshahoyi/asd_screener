import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  sessionTimeLimit: number; // in seconds
  cl1Timeout: number; // in seconds
  cl2Timeout: number; // in seconds
  cl3Timeout: number; // in seconds
  cl4Timeout: number; // in seconds
}

const defaultSettings: AppSettings = {
  sessionTimeLimit: 5,
  cl1Timeout: 30,
  cl2Timeout: 30,
  cl3Timeout: 30,
  cl4Timeout: 30,
};

const SETTINGS_KEY = 'app_settings';

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error getting settings', error);
    return defaultSettings;
  }
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    const settingsJson = JSON.stringify(settings);
    await AsyncStorage.setItem(SETTINGS_KEY, settingsJson);
  } catch (error) {
    console.error('Error saving settings', error);
  }
};
