import { renderHook, act } from '@testing-library/react-native';
import { useSound } from './useSound';
import { Audio } from 'expo-av';

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          unloadAsync: jest.fn().mockResolvedValue(undefined),
          setOnPlaybackStatusUpdate: jest.fn(),
          playAsync: jest.fn().mockResolvedValue(undefined),
        },
      }),
    },
    setAudioModeAsync: jest.fn(),
  },
}));

const mockCreateAsync = Audio.Sound.createAsync as jest.Mock;
const mockSetAudioModeAsync = Audio.setAudioModeAsync as jest.Mock;

describe('useSound', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call setAudioModeAsync on initial render', () => {
    renderHook(() => useSound());
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  });

  it('should load and play a sound', async () => {
    const { result } = renderHook(() => useSound());

    await act(async () => {
      await result.current.playSound('intro');
    });

    expect(mockCreateAsync).toHaveBeenCalledWith(expect.any(Number), { shouldPlay: true }, expect.any(Function));
  });

  it('should call onPlaybackFinish when the sound finishes playing', async () => {
    const onPlaybackFinish = jest.fn();
    let playbackStatusUpdateCallback: (status: any) => void = () => {};

    mockCreateAsync.mockImplementation((source, initialStatus, onPlaybackStatusUpdate) => {
      playbackStatusUpdateCallback = onPlaybackStatusUpdate;
      return Promise.resolve({
        sound: {
          unloadAsync: jest.fn().mockResolvedValue(undefined),
          setOnPlaybackStatusUpdate: jest.fn(),
          playAsync: jest.fn().mockResolvedValue(undefined),
        },
      });
    });

    const { result } = renderHook(() => useSound());

    await act(async () => {
      await result.current.playSound('intro', onPlaybackFinish);
    });

    act(() => {
      playbackStatusUpdateCallback({ isLoaded: true, didJustFinish: true });
    });

    expect(onPlaybackFinish).toHaveBeenCalled();
  });

  it('should update isPlaying state correctly', async () => {
    const { result } = renderHook(() => useSound());

    let playbackStatusUpdateCallback: (status: any) => void = () => {};
    mockCreateAsync.mockImplementation((source, initialStatus, onPlaybackStatusUpdate) => {
      playbackStatusUpdateCallback = onPlaybackStatusUpdate;
      return Promise.resolve({
        sound: {
          unloadAsync: jest.fn().mockResolvedValue(undefined),
          setOnPlaybackStatusUpdate: jest.fn(),
          playAsync: jest.fn().mockResolvedValue(undefined),
        },
      });
    });

    await act(async () => {
      result.current.playSound('intro');
    });

    expect(result.current.isPlaying).toBe(true);

    await act(async () => {
      playbackStatusUpdateCallback({ isLoaded: true, didJustFinish: true });
    });

    expect(result.current.isPlaying).toBe(false);
  });
});
