export const useAudioPlayer = jest.fn().mockReturnValue({
  replace: jest.fn(),
  seekTo: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
});

export const useAudioPlayerStatus = jest.fn().mockReturnValue({
  didJustFinish: false,
});
