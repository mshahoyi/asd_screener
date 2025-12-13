import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('expo-sqlite');
jest.mock('drizzle-orm/expo-sqlite');
jest.mock('drizzle-orm/expo-sqlite/migrator');

jest.mock('expo-video', () => {
  const React = require('react');
  return {
    VideoView: (props) => React.createElement('VideoView', props, props.children),
    VideoPlayer: class VideoPlayer {},
    createVideoPlayer: jest.fn(() => ({
      play: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      release: jest.fn(),
      replaceAsync: jest.fn(() => Promise.resolve()),
      currentTime: 0,
    })),
    useVideoPlayer: jest.fn(),
  };
});
global.alert = jest.fn();
