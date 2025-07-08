import { useState, useEffect, useCallback } from "react";
import { Audio } from "expo-av";
import { AVPlaybackStatus } from "expo-av/build/AV";
import { useGame } from "@/scripts/GameContext";

// Define a mapping from sound names to their file paths
const soundFiles = {
  intro: require("@/assets/intro.m4a"),
  looking: require("@/assets/looking.m4a"),
  pointing: require("@/assets/pointing.m4a"),
  shining: require("@/assets/shining.m4a"),
  drag: require("@/assets/drag.m4a"),
  positiveTap: require("@/assets/positive-tap.m4a"),
  negativeTap: require("@/assets/negative-tap.m4a"),
  positiveDrag: require("@/assets/positive-drag.m4a"),
  bye: require("@/assets/bye.m4a"),
};

export type SoundName = keyof typeof soundFiles;

export const useSound = () => {
  const { send, state } = useGame();

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  return {};
};
