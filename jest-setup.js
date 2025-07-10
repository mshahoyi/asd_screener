import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('expo-sqlite');
jest.mock('drizzle-orm/expo-sqlite');
jest.mock('drizzle-orm/expo-sqlite/migrator');
global.alert = jest.fn();
