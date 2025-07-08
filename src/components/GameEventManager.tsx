import React, { useEffect } from 'react';
import { useSound } from '../hooks/useSound';
import { useGame } from '../GameContext';

export const GameEventManager: React.FC = () => {
  const { state, send } = useGame();
  const { playSound } = useSound();

  useEffect(() => {
    if (state.matches('introduction')) {
      playSound('intro', () => {
        send({ type: 'START_GAME' });
      });
    }
  }, [state, send, playSound]);

  return null;
};
