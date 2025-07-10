import { useEffect, useState, useRef } from 'react';
import { useGame } from '@/scripts/GameContext';
import * as settingsController from '@/scripts/settingsController';

export const useGameTimers = () => {
  const [state, send] = useGame();
  const [settings, setSettings] = useState<settingsController.AppSettings | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clueTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    settingsController.getSettings().then(setSettings).catch(alert);
  }, []);

  // Session Timer
  useEffect(() => {
    if (!settings) {
      alert('No settings for session timer');
      return;
    }

    sessionTimerRef.current = setTimeout(() => {
      send({ type: 'SESSION_TIMER_ELAPSED' });
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
      }
    }, settings.sessionTimeLimit);

    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
      }
    };
  }, [settings, send]);

  // Clue Timer
  useEffect(() => {
    if (!settings) {
      alert('No settings for clue timers');
      return;
    }

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
    }, timeout);

    return () => {
      if (clueTimerRef.current) {
        clearTimeout(clueTimerRef.current);
      }
    };
  }, [settings, state.context.cueLevel]);
};
