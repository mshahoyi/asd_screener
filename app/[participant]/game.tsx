import React, { JSX } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGame } from '@/scripts/GameContext';
import { useSound } from '@/hooks/useSound';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useDragHandler } from '@/hooks/useDragHandler';
import { trackEvent } from '@/scripts/analytics';
import { mapTouchEventToProps } from '@/scripts/utils';
import { CharacterAssetKey, characterAssets } from '@/components/gameUtils';
import { DraggableItem } from '@/components/DraggableItem';
import { useGameEvents } from '@/hooks/useGameEvents';

// Helper to get character image based on state, cue level, and correct item position
const getCharacterImage = (stateValue: string, cueLevel: number, correctItem: string): CharacterAssetKey => {
  if (stateValue === 'introduction') {
    return 'neutral';
  }
  if (stateValue === 'awaitingDrag') {
    return 'openHands';
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  let directionToUse;
  if (cueLevel === 1) {
    // At CL1, character gazes at correct item
    directionToUse = correctItem;
  } else if (cueLevel === 2 || cueLevel === 3) {
    // At CL2 and CL3, character faces/points opposite direction for basic left/right
    if (correctItem === 'left') {
      directionToUse = 'right';
    } else if (correctItem === 'right') {
      directionToUse = 'left';
    } else {
      // For other positions, use the correct item direction
      directionToUse = correctItem;
    }
  } else {
    // For CL4 and others, use correct item direction
    directionToUse = correctItem;
  }

  const formattedDirection = directionToUse.split('-').map(capitalize).join('');

  switch (cueLevel) {
    case 1:
      return `gaze${formattedDirection}` as CharacterAssetKey;
    case 2:
      return `face${formattedDirection}` as CharacterAssetKey;
    case 3:
      return `point${formattedDirection}` as CharacterAssetKey;
    case 4:
      return 'neutral'; // Glow is on the item, character is neutral
    default:
      return 'neutral';
  }
};

// Helper to get game items based on difficulty and correct item
const getGameItems = (
  difficultyLevel: number,
  correctItem: string,
  cueLevel: number,
  send: Function,
  isAwaitingDrag: boolean,
  characterBounds: { x: number; y: number; width: number; height: number } | null
): React.ReactNode[] => {
  const items: JSX.Element[] = [];
  const imageKey: CharacterAssetKey = 'itemKettleBlue';

  const positions = difficultyLevel === 1 ? ['left', 'right'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  const getPositionStyle = (position: string): any => {
    switch (position) {
      case 'left':
        return { left: '5%', top: '45%' };
      case 'right':
        return { right: '5%', top: '45%' };
      case 'top-left':
        return { left: '5%', top: '10%' };
      case 'top-right':
        return { right: '5%', top: '10%' };
      case 'bottom-left':
        return { left: '5%', bottom: '10%' };
      case 'bottom-right':
        return { right: '5%', bottom: '10%' };
      default:
        return { left: '45%', top: '45%' };
    }
  };

  positions.forEach((position) => {
    const isCorrect = position === correctItem;
    const isGlowing = cueLevel === 4 && isCorrect;
    const positionStyle = getPositionStyle(position);

    items.push(
      <View key={position} style={[styles.gameItemContainer, positionStyle]}>
        <DraggableItem
          isCorrect={isCorrect}
          isGlowing={isGlowing}
          imageKey={imageKey}
          onSelect={() => send({ type: 'SELECTION', selectedPosition: position })}
          isAwaitingDrag={isAwaitingDrag}
          send={send}
          characterBounds={characterBounds}
          itemPosition={position}
        />
      </View>
    );
  });
  return items;
};

export default function GameScreen() {
  const router = useRouter();
  const { participantId } = useLocalSearchParams<{ participantId: string }>();
  useGameEvents(participantId);
  const [state, send] = useGame();
  useSound();
  const [characterBounds, setCharacterBounds] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Add effect to log state changes
  React.useEffect(() => {
    console.debug('=== GAME STATE CHANGE ===');
    console.debug('Current state:', state.value);
    console.debug('State context:', JSON.stringify(state.context));
    console.debug('State matches awaitingDrag:', state.matches('awaitingDrag'));
    console.debug('Send function type:', typeof send);
    console.debug('=== END GAME STATE CHANGE ===');
  }, [state]);

  const handleCharacterLayout = React.useCallback((event: any) => {
    console.debug('=== CHARACTER LAYOUT ===');
    const { x, y, width, height } = event.nativeEvent.layout;
    const bounds = { x, y, width, height };
    setCharacterBounds(bounds);
    console.debug('Character bounds set:', JSON.stringify(bounds));
    console.debug('=== END CHARACTER LAYOUT ===');
  }, []);

  const isAwaitingDrag = state.matches('awaitingDrag');
  const characterImageKey = getCharacterImage(state.value as string, state.context.cueLevel, state.context.correctItem);
  const gameItems = getGameItems(
    state.context.difficultyLevel,
    state.context.correctItem,
    state.context.cueLevel,
    send,
    isAwaitingDrag,
    characterBounds
  );

  return (
    <GestureHandlerRootView
      style={styles.container}
      onTouchStart={(e) => trackEvent('touch_start', participantId, mapTouchEventToProps(e))}
      onTouchMove={(e) => trackEvent('touch_move', participantId, mapTouchEventToProps(e))}
      onTouchEnd={(e) => trackEvent('touch_end', participantId, mapTouchEventToProps(e))}
    >
      <Text style={styles.gameInfo}>Game Screen</Text>
      <Text style={styles.gameInfo}>Difficulty: {state.context.difficultyLevel}</Text>
      <Text style={styles.gameInfo}>Cue: {state.context.cueLevel}</Text>
      <Text style={styles.gameInfo}>State: {state.value as string}</Text>

      {/* Character in center */}
      <View
        style={styles.characterContainer}
        onLayout={handleCharacterLayout}
        // onTouchStart={(e) => handleTouchStart(e, 'Character')}
        // onTouchMove={(e) => handleTouchMove(e, 'Character')}
        // onTouchEnd={(e) => handleTouchEnd(e, 'Character')}
      >
        <Image
          testID={`character-image-${characterImageKey}`}
          source={characterAssets[characterImageKey]}
          style={styles.characterImage}
          contentFit="contain"
        />
      </View>

      {/* Drop zone indicator - only visible during drag state */}
      {isAwaitingDrag && (
        <View style={styles.dropZoneIndicator}>
          <Text style={styles.dropZoneText}>Drop Here</Text>
        </View>
      )}

      {/* Items positioned around character */}
      {state.value !== 'introduction' && <View style={styles.gameArea}>{gameItems}</View>}

      <Button title="End Session" onPress={() => router.back()} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  gameInfo: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 2,
  },
  characterContainer: {
    position: 'absolute',
    top: '20%',
    left: '20%',
    width: '60%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  characterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  dropZoneIndicator: {
    position: 'absolute',
    top: '20%',
    left: '20%',
    width: '60%',
    height: '60%',
    backgroundColor: 'rgba(128, 128, 128, 0.3)', // Faint gray with transparency
    borderWidth: 2,
    borderColor: 'rgba(128, 128, 128, 0.5)',
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5, // Above character but below dragged items
  },
  dropZoneText: {
    color: 'rgba(128, 128, 128, 0.8)',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gameArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  gameItemContainer: {
    position: 'absolute',
    width: '15%', // Increased from 10% to make items more visible
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Temporary background to see positioning
  },
});
