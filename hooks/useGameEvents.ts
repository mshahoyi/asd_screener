import { useEffect } from 'react';
import { useGame } from '@/scripts/GameContext';
import { GameStateEmittedEvent } from '@/scripts/gameState';
import { trackEvent } from '@/scripts/analytics';

export const useGameEvents = (participantId: string) => {
  const [state, send, actor] = useGame();

  useEffect(() => {
    const sub = actor.on('*', (emittedEvent: GameStateEmittedEvent<'SELECTION' | 'DRAG_SUCCESSFUL'>) => {
      switch (emittedEvent.type) {
        case 'SELECTION':
          trackEvent('selection', participantId, actor.getSnapshot().context);
          break;

        case 'DRAG_SUCCESSFUL':
          trackEvent('drag_successful', participantId, actor.getSnapshot().context);
          break;
      }
    });

    return () => sub.unsubscribe();
  }, []);
};
