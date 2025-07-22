import React, { useState, useEffect, useCallback, use, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { VideoPlayer, VideoView, createVideoPlayer, useVideoPlayer } from 'expo-video';
import { useGame } from '@/scripts/GameContext';
import { GameStateEmittedEvent } from '@/scripts/gameState';
import { router, useLocalSearchParams } from 'expo-router';
import { endGame } from '@/db/controller';

// Define a mapping from video names to their file paths
const videoFiles = {
  intro: require('@/assets/intro.mp4'),
  'gaze-left': require('@/assets/gaze-left.mp4'),
  'gaze-right': require('@/assets/gaze-right.mp4'),
  'gaze-top-left': require('@/assets/gaze top left.mp4'),
  'gaze-top-right': require('@/assets/gaze top right.mp4'),
  'gaze-bottom-left': require('@/assets/gaze bottom left.mp4'),
  'gaze-bottom-right': require('@/assets/gaze bottom right.mp4'),
  'face-left': require('@/assets/look left.mp4'),
  'face-right': require('@/assets/look right.mp4'),
  'face-top-left': require('@/assets/look top left.mp4'),
  'face-top-right': require('@/assets/look top right.mp4'),
  'face-bottom-left': require('@/assets/look bottom left.mp4'),
  'face-bottom-right': require('@/assets/look bottom right.mp4'),
  'point-left': require('@/assets/pointing left.mp4'),
  'point-right': require('@/assets/pointing right.mp4'),
  'point-top-left': require('@/assets/pointing top left.mp4'),
  'point-top-right': require('@/assets/pointing top right.mp4'),
  'point-bottom-left': require('@/assets/pointing bottom left.mp4'),
  'point-bottom-right': require('@/assets/pointing bottom right.mp4'),
  'shining-left': require('@/assets/shining left.mp4'),
  'shining-right': require('@/assets/shining right.mp4'),
  'shining-top-left': require('@/assets/shining top left.mp4'),
  'shining-top-right': require('@/assets/shining top right.mp4'),
  'shining-bottom-left': require('@/assets/shining bottom left.mp4'),
  'shining-bottom-right': require('@/assets/shining bottom right.mp4'),
  drag: require('@/assets/drag.mp4'),
  'drag-success': require('@/assets/drag-success.mp4'),
  'tap-negative': require('@/assets/tap negative.mp4'),
  'tap-positive': require('@/assets/positive tap.mp4'),
  bye: require('@/assets/bye.mp4'),
};

export type VideoName = keyof typeof videoFiles;

const getDirectionalVideoName = (baseName: string, correctItem: string): VideoName => {
  const videoKey = `${baseName}-${correctItem}` as VideoName;
  return videoKey;
};

interface GameVideoProps {
  handleCharacterLayout: (event: any) => void;
}

export const GameVideo: React.FC<GameVideoProps> = ({ handleCharacterLayout }) => {
  const [state, send, actor] = useGame();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const gameIdNumber = parseInt(gameId as string, 10);
  const currentVideo = useRef<VideoName>('intro');
  const onFinish = useRef<() => void>(null);
  const player = useRef<VideoPlayer>(null);

  useEffect(() => {
    player.current = createVideoPlayer(videoFiles[currentVideo.current]);
    player.current.play();
    onFinish.current = () => send({ type: 'START_GAME' });

    const subscription = player.current.addListener('playingChange', ({ isPlaying }) => {
      if (!isPlaying) {
        const onFinishCb = onFinish.current;
        onFinish.current = null;
        onFinishCb?.();
      }
    });

    return () => {
      player.current?.release();
      subscription.remove();
    };
  }, []);

  const playVideo = (videoName: VideoName, onFinishCb?: () => void) => {
    if (state.value === 'sessionEnded' && videoName !== 'bye') return;

    currentVideo.current = videoName;
    const videoSrc = videoFiles[videoName];

    player.current
      ?.replaceAsync(videoSrc)
      .then(() => {
        player.current!.currentTime = 0;
        setTimeout(() => {
          player.current?.play();
          onFinish.current = onFinishCb || null;
        }, 100);
      })
      .catch((error) => {
        alert(error);
        console.error('Error replacing video:', error);
        throw error;
      });
  };

  // Handle session end
  useEffect(() => {
    if (state.value === 'sessionEnded') {
      playVideo('bye', () => {
        // Save game ending time to database
        endGame(gameIdNumber)
          .then(() => router.back())
          .catch((error) => {
            console.error('Error ending game:', error);
            alert(error);
          });
      });
    }
  }, [state.value, playVideo, gameIdNumber]);

  // Handle game events
  useEffect(() => {
    const cueVideoTypes: Record<number, string> = {
      1: 'gaze',
      2: 'face',
      3: 'point',
      4: 'shining',
    };

    const sub = actor.on('*', (emittedEvent: GameStateEmittedEvent<'SELECTION' | 'DRAG_SUCCESSFUL' | 'TRIAL_TIMEOUT' | 'GAME_STARTED'>) => {
      const state = actor.getSnapshot();
      switch (emittedEvent.type) {
        case 'SELECTION':
          const { correctItem, selectedPosition } = emittedEvent as GameStateEmittedEvent<'SELECTION'>;
          if (correctItem === selectedPosition) {
            playVideo('tap-positive', () => playVideo('drag'));
          } else {
            playVideo('tap-negative', () => {
              const cueType = cueVideoTypes[state.context.cueLevel];
              const cueVideo = getDirectionalVideoName(cueType, state.context.correctItem);
              playVideo(cueVideo);
            });
          }
          break;

        case 'DRAG_SUCCESSFUL':
          playVideo('drag-success', () => {
            send({ type: 'NEXT_TRIAL' });
            const gazeVideo = getDirectionalVideoName('gaze', state.context.correctItem);
            playVideo(gazeVideo);
          });
          break;

        case 'TRIAL_TIMEOUT':
          const { currentCueLevel } = emittedEvent as GameStateEmittedEvent<'TRIAL_TIMEOUT'>;
          if (state.value === 'presentingTrial') {
            const cueType = cueVideoTypes[currentCueLevel];
            const cueVideo = getDirectionalVideoName(cueType, state.context.correctItem);
            playVideo(cueVideo);
          } else {
            playVideo('drag');
          }
          break;

        case 'GAME_STARTED':
          const gazeVideo = getDirectionalVideoName('gaze', state.context.correctItem);
          playVideo(gazeVideo);
          break;
      }
    });

    return () => sub.unsubscribe();
  }, []);

  return (
    <View style={styles.characterContainer} onLayout={handleCharacterLayout}>
      <VideoView
        style={styles.characterImage}
        player={player.current!}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  characterContainer: {
    position: 'absolute',
    top: '30%',
    left: '35%',
    width: '30%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
});
