import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { GameEventManager } from './GameEventManager';
import { GameProvider } from '../GameContext';
import { createActor } from 'xstate';
import { gameMachine } from '../../scripts/gameState';
import { Audio } from 'expo-av';

// Mock expo-av completely
jest.mock('expo-av');

const renderWithGameContext = (ui: React.ReactElement) => {
  const gameActor = createActor(gameMachine).start();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <GameProvider machine={gameActor}>{children}</GameProvider>
  );
  return {
    ...render(ui, { wrapper: Wrapper }),
    gameActor,
  };
};

describe('GameEventManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should play the intro sound when the machine enters the "introduction" state', async () => {
    renderWithGameContext(<GameEventManager />);
    
    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      expect.any(Object),
      { shouldPlay: true },
      expect.any(Function)
    ));
  });

  it('should send START_GAME event when the intro sound finishes', async () => {
    // Create the actor and spy BEFORE rendering
    const gameActor = createActor(gameMachine).start();
    const sendSpy = jest.spyOn(gameActor, 'send');

    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <GameProvider machine={gameActor}>{children}</GameProvider>
    );

    render(<GameEventManager />, { wrapper: Wrapper });

    // Wait for the sound to be created
    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      expect.any(Object),
      { shouldPlay: true },
      expect.any(Function)
    ));

    // Manually trigger the sound finish using the mock helper
    await act(async () => {
      (global as any).mockPlaybackFinish();
    });

    expect(sendSpy).toHaveBeenCalledWith({ type: 'START_GAME' });
  });

  it('should play the "looking" sound when cue level is 1', async () => {
    const { gameActor } = renderWithGameContext(<GameEventManager />);
    await act(async () => {
      gameActor.send({ type: 'START_GAME' });
    });
    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      expect.any(Object),
      { shouldPlay: true },
      expect.any(Function)
    ));
  });

  it('should play the "pointing" sound when cue level is 3', async () => {
    const { gameActor } = renderWithGameContext(<GameEventManager />);
    await act(async () => {
      gameActor.send({ type: 'START_GAME' });
      gameActor.send({ type: 'TIMEOUT' });
      gameActor.send({ type: 'TIMEOUT' });
    });
    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      expect.any(Object),
      { shouldPlay: true },
      expect.any(Function)
    ));
  });

  it('should play the "shining" sound when cue level is 4', async () => {
    const { gameActor } = renderWithGameContext(<GameEventManager />);
    await act(async () => {
      gameActor.send({ type: 'START_GAME' });
      gameActor.send({ type: 'TIMEOUT' });
      gameActor.send({ type: 'TIMEOUT' });
      gameActor.send({ type: 'TIMEOUT' });
    });
    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      expect.any(Object),
      { shouldPlay: true },
      expect.any(Function)
    ));
  });

  it('should play the "drag" sound when awaiting drag', async () => {
    const { gameActor } = renderWithGameContext(<GameEventManager />);
    await act(async () => {
      gameActor.send({ type: 'START_GAME' });
      gameActor.send({ type: 'SELECTION', selectedPosition: 'left' });
    });
    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      expect.any(Object),
      { shouldPlay: true },
      expect.any(Function)
    ));
  });

  it('should play the "bye" sound when the session ends', async () => {
    const { gameActor } = renderWithGameContext(<GameEventManager />);
    await act(async () => {
      gameActor.send({ type: 'EXIT' });
    });
    await waitFor(() => expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      expect.any(Object),
      { shouldPlay: true },
      expect.any(Function)
    ));
  });
});
