import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import GameScreen from './[gameId]';
import { GameProvider } from '@/scripts/GameContext';
import { createActor } from 'xstate';
import { gameMachine } from '@/scripts/gameState';
import { router } from 'expo-router';
import { View } from 'react-native';

const getMockPlayer = () => {
  const { createVideoPlayer } = require('expo-video');
  const player = createVideoPlayer.mock.results[0]?.value;
  if (!player) throw new Error('Expected createVideoPlayer to have been called');
  return { createVideoPlayer, player };
};

const flushVideoOnFinishAssignment = async () => {
  // GameVideo sets its "onFinish" callback inside a 100ms timer *after* replaceAsync resolves.
  // replaceAsync resolves via a promise, so we need to flush microtasks before advancing timers.
  await act(async () => {
    await Promise.resolve();
  });
  act(() => {
    jest.advanceTimersByTime(150);
  });
};

// Mock the useRouter and useLocalSearchParams hooks
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children }: { children: React.ReactNode }) => children,
  },
  useLocalSearchParams: () => ({ participant: '1', gameId: '1' }),
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock('expo-image');
jest.mock('@/db/controller', () => ({
  endGame: jest.fn(() => Promise.resolve()),
  saveItemClick: jest.fn(() => Promise.resolve()),
}));

// Custom render function to wrap components with GameProvider and expose the machine actor
const renderWithGameContext = (ui: React.ReactElement) => {
  const gameActor = createActor(gameMachine).start();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <GameProvider machine={gameActor}>{children}</GameProvider>;
  return {
    ...render(ui, { wrapper: Wrapper }),
    gameActor, // Expose the actor for direct interaction in tests
  };
};

describe('GameScreen UI with Assets', () => {
  // Mock Math.random to control correct item assignment for tests
  let mockMathRandom: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    // Default mock for Math.random to return a value that results in 'left' for DL1
    mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.1);
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    mockMathRandom.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  it('should display the neutral character in introduction state initially', () => {
    renderWithGameContext(<GameScreen />);
    const { createVideoPlayer, player } = getMockPlayer();
    expect(createVideoPlayer).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalled();
    expect(player.__source).toBe(require('@/assets/intro.mp4'));
    // Initially in introduction state, items are not visible yet
    expect(screen.queryAllByTestId('game-item-left').length).toBe(0); // No items in introduction
  });

  it('should transition to gaze and items after START_GAME event', () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    const { player } = getMockPlayer();
    act(() => gameActor.send({ type: 'START_GAME' }));

    expect(player.replaceAsync).toHaveBeenCalledWith(require('@/assets/gaze-left.mp4')); // correctItem = left due to mock
    expect(screen.getAllByTestId('game-item-left').length).toBe(1);
    expect(screen.getAllByTestId('game-item-right').length).toBe(1);
  });

  it('should display the character with head turn for CL2', async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    const { player } = getMockPlayer();
    act(() => gameActor.send({ type: 'START_GAME' }));
    fireEvent.press(screen.getByTestId('game-item-right')); // Incorrect selection to get to CL2
    expect(gameActor.getSnapshot().context.cueLevel).toBe(2);

    // Incorrect selection plays tap-negative, then (after it ends) the CL2 "face" cue for the correct side.
    expect(player.replaceAsync).toHaveBeenCalledWith(require('@/assets/tap negative.mp4'));
    await flushVideoOnFinishAssignment();
    act(() => {
      player.__emitPlayingChange({ isPlaying: false });
    });
    expect(player.replaceAsync).toHaveBeenCalledWith(require('@/assets/look left.mp4'));
  });

  it('should display the character pointing for CL3', async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    const { player } = getMockPlayer();
    act(() => gameActor.send({ type: 'START_GAME' }));
    fireEvent.press(screen.getByTestId('game-item-right')); // CL2
    await flushVideoOnFinishAssignment();
    act(() => {
      player.__emitPlayingChange({ isPlaying: false });
    });
    fireEvent.press(screen.getByTestId('game-item-right')); // CL3
    expect(gameActor.getSnapshot().context.cueLevel).toBe(3);

    // Second incorrect selection plays tap-negative, then CL3 "point" cue for the correct side.
    expect(player.replaceAsync).toHaveBeenCalledWith(require('@/assets/tap negative.mp4'));
    await flushVideoOnFinishAssignment();
    act(() => {
      player.__emitPlayingChange({ isPlaying: false });
    });
    expect(player.replaceAsync).toHaveBeenCalledWith(require('@/assets/pointing left.mp4'));
  });

  it('should display the character with open hands when awaiting drag', async () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    const { player } = getMockPlayer();
    act(() => gameActor.send({ type: 'START_GAME' }));
    fireEvent.press(screen.getByTestId('game-item-left')); // Correct selection
    expect(gameActor.getSnapshot().value).toBe('awaitingDrag');

    // Correct selection plays tap-positive, then (after it ends) transitions to the drag instruction video.
    expect(player.replaceAsync).toHaveBeenCalledWith(require('@/assets/positive tap.mp4'));
    await flushVideoOnFinishAssignment();
    act(() => {
      player.__emitPlayingChange({ isPlaying: false });
    });
    expect(player.replaceAsync).toHaveBeenCalledWith(require('@/assets/drag.mp4'));
  });

  it('should display four items for difficulty level 2', () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: 'START_GAME' }));
    fireEvent.press(screen.getByTestId('game-item-left'));
    act(() => gameActor.send({ type: 'DRAG_SUCCESSFUL' }));

    expect(screen.getAllByTestId('game-item-top-left').length).toBe(1);
    expect(screen.getAllByTestId('game-item-top-right').length).toBe(1);
    expect(screen.getAllByTestId('game-item-bottom-left').length).toBe(1);
    expect(screen.getAllByTestId('game-item-bottom-right').length).toBe(1);
  });

  it('should display the correct item with a glow for CL4', () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: 'START_GAME' }));
    fireEvent.press(screen.getByTestId('game-item-right')); // CL2
    fireEvent.press(screen.getByTestId('game-item-right')); // CL3
    fireEvent.press(screen.getByTestId('game-item-right')); // CL4
    expect(gameActor.getSnapshot().context.cueLevel).toBe(4);
    expect(screen.getByTestId('game-item-left')).toBeTruthy(); // Correct item is 'left' due to mock
  });

  it('should still have the End Session button', () => {
    const { gameActor } = renderWithGameContext(<GameScreen />);
    act(() => gameActor.send({ type: 'START_GAME' }));
    expect(screen.getByTestId('end-session-button')).toBeTruthy();
  });
});

describe('GameScreen state reset on unmount', () => {
  it('should reset the game state back to introduction when GameScreen unmounts', async () => {
    // Force deterministic correctItem assignment: DL1 => 'left'
    const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.1);

    let lastState: any = null;
    let sendFn: any = null;

    const StateProbe = () => {
      const [state, send] = require('@/scripts/GameContext').useGame();
      lastState = state;
      sendFn = send;
      return null;
    };

    const Harness = ({ show }: { show: boolean }) => (
      <GameProvider machine={gameMachine}>
        <StateProbe />
        {show ? <GameScreen /> : <View testID="gone" />}
      </GameProvider>
    );

    const { rerender } = render(<Harness show={true} />);

    // Move away from introduction and escalate cue level to 2 (guaranteed wrong selection vs 'left')
    act(() => {
      sendFn({ type: 'START_GAME' });
      sendFn({ type: 'SELECTION', selectedPosition: 'right' }); // wrong -> CL2, stay presentingTrial
    });

    await waitFor(() => {
      expect(lastState.value).toBe('presentingTrial');
      expect(lastState.context.cueLevel).toBe(2);
    });

    // Unmount GameScreen
    rerender(<Harness show={false} />);

    // After unmount, state should be fully reset
    await waitFor(() => {
      expect(lastState.value).toBe('introduction');
      expect(lastState.context.difficultyLevel).toBe(1);
      expect(lastState.context.cueLevel).toBe(1);
      expect(lastState.context.trialCount).toBe(1);
    });

    mockMathRandom.mockRestore();
  });
});
