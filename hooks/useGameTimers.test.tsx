import { renderHook, act, waitFor, cleanup } from '@testing-library/react-native';
import { useGameTimers } from './useGameTimers';
import { createActor } from 'xstate';
import { gameMachine } from '@/scripts/gameState';
import { GameProvider } from '@/scripts/GameContext';
import * as settingsController from '@/scripts/settingsController';
import React from 'react';

global.alert = jest.fn();
jest.spyOn(global, 'clearTimeout');
// Mock settings controller
jest.mock('@/scripts/settingsController');

const mockSettings: settingsController.AppSettings = {
  sessionTimeLimit: 5, // 5000 ms
  cl1Timeout: 1, // 1000 ms
  cl2Timeout: 1,
  cl3Timeout: 1,
  cl4Timeout: 1,
};

// Custom render function
const renderWithGameContext = (hookFunction: Parameters<typeof renderHook>[0]) => {
  let events: string[] = [];
  const gameActor = createActor(gameMachine, {
    inspect: (inspEvent) => {
      if (inspEvent.type === '@xstate.event') events.push(inspEvent.event.type);
    },
  }).start();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <GameProvider machine={gameActor}>{children}</GameProvider>;

  return {
    ...renderHook(hookFunction, { wrapper: Wrapper }),
    gameActor,
    events,
  };
};

describe('useGameTimers', () => {
  let mockMathRandom: jest.SpyInstance;

  beforeEach(() => {
    mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.1);
    jest.useFakeTimers();
    (settingsController.getSettings as jest.Mock).mockResolvedValue(mockSettings);
  });

  afterEach(async () => {
    await act(async () => {
      cleanup();
    });
    jest.useRealTimers();
    jest.clearAllMocks();
    mockMathRandom.mockRestore();
  });

  it('should dispatch TIMEOUT when the clue timer finishes', async () => {
    const { events, gameActor } = renderWithGameContext(() => useGameTimers());
    act(() => gameActor.send({ type: 'START_GAME' }));

    await act(async () => jest.runOnlyPendingTimers());

    await waitFor(() => expect(gameActor.getSnapshot().value).toBe('sessionEnded'));
    expect(events).toContain('TIMEOUT');
    expect(events).toContain('SESSION_TIMER_ELAPSED');
  });

  it('should dispatch SESSION_TIMER_ELAPSED when the session timer finishes', async () => {
    const { events, gameActor } = renderWithGameContext(() => useGameTimers());
    act(() => gameActor.send({ type: 'START_GAME' }));

    await act(async () => jest.runAllTimers());

    await waitFor(() => expect(gameActor.getSnapshot().value).toBe('sessionEnded'));
    await waitFor(() => expect(events).toContain('SESSION_TIMER_ELAPSED'));
    await waitFor(() => expect(events).toContain('TIMEOUT'));
  });
});
