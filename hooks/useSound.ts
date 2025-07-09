import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/scripts/GameContext';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { GameStateEmittedEvent } from '@/scripts/gameState';

// Define a mapping from sound names to their file paths
const soundFiles = {
  intro: require('@/assets/intro.m4a'),
  looking: require('@/assets/looking.m4a'),
  pointing: require('@/assets/pointing.m4a'),
  shining: require('@/assets/shining.m4a'),
  drag: require('@/assets/drag.m4a'),
  positiveTap: require('@/assets/positive-tap.m4a'),
  negativeTap: require('@/assets/negative-tap.m4a'),
  positiveDrag: require('@/assets/positive-drag.m4a'),
  bye: require('@/assets/bye.m4a'),
};

export type SoundName = keyof typeof soundFiles;

export const useSound = () => {
  const [state, send, actor] = useGame();
  const player = useAudioPlayer(soundFiles.intro);
  const status = useAudioPlayerStatus(player);
  const callback = useRef<() => unknown>(null);

  useEffect(() => {
    if (status.didJustFinish) callback.current?.();
  }, [status.didJustFinish]);

  const playSound = useCallback((soundName: SoundName, cb?: () => unknown) => {
    player.pause();
    player.replace(soundFiles[soundName]);
    player.seekTo(0);
    player.play();
    callback.current = cb || null;
  }, []);

  useEffect(() => {
    playSound('intro', () => send({ type: 'START_GAME' }));
  }, []);

  useEffect(() => {
    const cueNegativeSounds: Record<number, SoundName> = {
      2: 'looking',
      3: 'pointing',
      4: 'shining',
    };

    const sub = actor.on('*', (emittedEvent: GameStateEmittedEvent<'SELECTION' | 'DRAG_SUCCESSFUL'>) => {
      switch (emittedEvent.type) {
        case 'SELECTION':
          const { correctItem, selectedPosition } = emittedEvent as GameStateEmittedEvent<'SELECTION'>;
          if (correctItem === selectedPosition) {
            playSound('positiveTap', () => playSound('drag'));
          } else {
            playSound('negativeTap', () => playSound(cueNegativeSounds[actor.getSnapshot().context.cueLevel]));
          }
          break;

        case 'DRAG_SUCCESSFUL':
          playSound('positiveDrag');
          break;
      }
    });

    return () => sub.unsubscribe();
  }, []);

  return {};
};
