import { useEffect } from 'react';
import { useGame } from '@/scripts/GameContext';
import { GameStateEmittedEvent } from '@/scripts/gameState';
import { trackEvent } from '@/scripts/analytics';

export const useGameEvents = (participantId: number, gameId: number) => {
  const [state, send, actor] = useGame();

  useEffect(() => {
    const sub = actor.on('*', (emittedEvent: GameStateEmittedEvent<'SELECTION' | 'DRAG_SUCCESSFUL'>) => {
      switch (emittedEvent.type) {
        case 'SELECTION':
          trackEvent('selection', participantId, gameId, actor.getSnapshot().context);
          break;

        case 'DRAG_SUCCESSFUL':
          trackEvent('drag_successful', participantId, gameId, actor.getSnapshot().context);
          break;
      }
    });

    return () => sub.unsubscribe();
  }, []);
};
