import { useEffect, useState, useRef } from 'react';
import { useGame } from '@/scripts/GameContext';
import * as settingsController from '@/scripts/settingsController';

export const useGameTimers = () => {
  const [state, send] = useGame();
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clueTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Session Timer
  useEffect(() => {
    settingsController
      .getSettings()
      .then((settings) => {
        sessionTimerRef.current = setTimeout(() => {
          send({ type: 'SESSION_TIMER_ELAPSED' });
          if (sessionTimerRef.current) {
            clearTimeout(sessionTimerRef.current);
          }
        }, settings.sessionTimeLimit * 1000);
      })
      .catch(alert);

    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
      }
    };
  }, [send]);

  // Clue Timer
  useEffect(() => {
    if (state.value !== 'presentingTrial') return;

    settingsController
      .getSettings()
      .then((settings) => {
        const timeout = settings[`cl${state.context.cueLevel}Timeout` as keyof settingsController.AppSettings];
        if (!timeout) {
          alert(`No timeout for clue: ${state.context.cueLevel}`);
          return;
        }

        clueTimerRef.current = setTimeout(() => {
          send({ type: 'TIMEOUT' });
          if (clueTimerRef.current) {
            clearTimeout(clueTimerRef.current);
          }
        }, timeout * 1000);
      })
      .catch(alert);

    return () => {
      if (clueTimerRef.current) {
        clearTimeout(clueTimerRef.current);
      }
    };
  }, [state.context.cueLevel, state.value, send]);
};
