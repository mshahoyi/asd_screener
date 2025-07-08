import { renderHook, act } from '@testing-library/react-native';
import { useSound } from '@/hooks/useSound';
import { Actor, createActor, InspectionEvent, transition } from 'xstate';
import { gameMachine } from '@/scripts/gameState';
import { GameProvider } from '@/scripts/GameContext';
import { AudioStatus, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React from 'react';

// Mock expo-av
jest.mock('expo-audio');

const mockUseCallbackReturn = jest.fn();
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (callback: Function, deps: unknown[]) => mockUseCallbackReturn.mockImplementation(callback as () => unknown),
}));

// Custom render function to wrap components with GameProvider and expose the machine actor
const renderWithGameContext = (hookFunction: Parameters<typeof renderHook>[0]) => {
  const events: string[] = [];
  const gameActor = createActor(gameMachine, {
    inspect: (inspEvent) => {
      if (inspEvent.type === '@xstate.event') events.push(inspEvent.event.type);
    },
  }).start();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <GameProvider machine={gameActor}>{children}</GameProvider>;
  return {
    ...renderHook(hookFunction, { wrapper: Wrapper }),
    gameActor, // Expose the actor for direct interaction in tests
    events,
  };
};

describe('useSound', () => {
  let mockMathRandom: jest.SpyInstance;

  beforeEach(() => {
    // Default mock for Math.random to return a value that results in 'left' for DL1
    mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.1);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockMathRandom.mockRestore();
  });

  it('plays the intro sound when mounted', () => {
    const player = useAudioPlayer();

    renderWithGameContext(() => useSound());

    expect(player.play).toHaveBeenCalled();
  });

  it('dispatches the START_GAME event when the intro sound finishes playing', () => {
    const { events, rerender } = renderWithGameContext(() => useSound());

    finishSound(rerender);

    expect(events[events.length - 1]).toEqual('START_GAME');
  });

  it('stops other sounds when a new sound is played', () => {
    const player = useAudioPlayer();

    renderWithGameContext(() => useSound());

    expect(player.pause).toHaveBeenCalled();
  });

  it('plays the right sound when the right object is selected', () => {
    const { gameActor, rerender } = renderWithGameContext(() => useSound());

    act(() => gameActor.send({ type: 'START_GAME' }));
    act(() => gameActor.send({ type: 'SELECTION', selectedPosition: 'left' }));

    expect(mockUseCallbackReturn).toHaveBeenLastCalledWith('positiveTap', expect.any(Function));
    finishSound(rerender);
    expect(mockUseCallbackReturn).toHaveBeenLastCalledWith('drag');
  });

  it('plays the right sound when the wrong object is selected', () => {
    const { gameActor, rerender } = renderWithGameContext(() => useSound());

    act(() => gameActor.send({ type: 'START_GAME' }));

    act(() => gameActor.send({ type: 'SELECTION', selectedPosition: 'right' }));
    expect(mockUseCallbackReturn).toHaveBeenNthCalledWith(2, 'negativeTap', expect.any(Function));
    finishSound(rerender);
    expect(mockUseCallbackReturn).toHaveBeenNthCalledWith(3, 'looking');

    act(() => gameActor.send({ type: 'SELECTION', selectedPosition: 'right' }));
    expect(mockUseCallbackReturn).toHaveBeenNthCalledWith(4, 'negativeTap', expect.any(Function));
    finishSound(rerender);
    expect(mockUseCallbackReturn).toHaveBeenNthCalledWith(5, 'pointing');

    act(() => gameActor.send({ type: 'SELECTION', selectedPosition: 'right' }));
    expect(mockUseCallbackReturn).toHaveBeenNthCalledWith(6, 'negativeTap', expect.any(Function));
    finishSound(rerender);
    expect(mockUseCallbackReturn).toHaveBeenNthCalledWith(7, 'shining');
  });
});

const finishSound = (rerender: (...args: unknown[]) => unknown) => {
  jest.mocked(useAudioPlayerStatus).mockReturnValueOnce({
    didJustFinish: true,
  } as AudioStatus);
  rerender(() => useSound());
};
