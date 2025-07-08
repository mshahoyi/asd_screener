import { useState, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { AVPlaybackStatus } from 'expo-av/build/AV';

// Define a mapping from sound names to their file paths
const soundFiles = {
  intro: require('../../assets/intro.m4a'),
  looking: require('../../assets/looking.m4a'),
  pointing: require('../../assets/pointing.m4a'),
  shining: require('../../assets/shining.m4a'),
  drag: require('../../assets/drag.m4a'),
  positiveTap: require('../../assets/positive-tap.m4a'),
  negativeTap: require('../../assets/negative-tap.m4a'),
  positiveDrag: require('../../assets/positive-drag.m4a'),
  bye: require('../../assets/bye.m4a'),
};

export type SoundName = keyof typeof soundFiles;

export const useSound = () => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playSound = useCallback(async (soundName: SoundName, onPlaybackFinish?: () => void) => {
    if (sound) {
      await sound.unloadAsync();
    }

    const { sound: newSound } = await Audio.Sound.createAsync(
      soundFiles[soundName],
      { shouldPlay: true },
      (status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          onPlaybackFinish?.();
        }
      }
    );

    setSound(newSound);
    setIsPlaying(true);
  }, [sound]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  return { playSound, isPlaying };
};
