import React, { JSX } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGame } from '@/scripts/GameContext';
import { useSound } from '@/hooks/useSound';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Import all assets dynamically
type AssetKey = keyof typeof assets;

const assets = {
  neutral: require('@/assets/neutral.png'),
  openHands: require('@/assets/open-hands.png'),
  faceBottomLeft: require('@/assets/face-bottom-left.png'),
  faceBottomRight: require('@/assets/face-bottom-right.png'),
  faceLeft: require('@/assets/face-left.png'),
  faceRight: require('@/assets/face-right.png'),
  faceTopLeft: require('@/assets/face-top-left.png'),
  faceTopRight: require('@/assets/face-top-right.png'),
  gazeBottomLeft: require('@/assets/gaze-bottom-left.png'),
  gazeBottomRight: require('@/assets/gaze-bottom-right.png'),
  gazeLeft: require('@/assets/gaze-left.png'),
  gazeRight: require('@/assets/gaze-right.png'),
  gazeTopLeft: require('@/assets/gaze-top-left.png'),
  gazeTopRight: require('@/assets/gaze-top-right.png'),
  pointBottomLeft: require('@/assets/point-bottom-left.png'),
  pointBottomRight: require('@/assets/point-bottom-right.png'),
  pointLeft: require('@/assets/point-left.png'),
  pointRight: require('@/assets/point-right.png'),
  pointTopLeft: require('@/assets/point-top-left.png'),
  pointTopRight: require('@/assets/point-top-right.png'),
  itemKettleBlue: require('@/assets/item-kettle-blue.png'),
  itemKettleBronze: require('@/assets/item-kettle-bronze.png'),
  itemKettleGray: require('@/assets/item-kettle-gray.png'),
  itemKettleRed: require('@/assets/item-kettle-red.png'),
  itemSocksCat: require('@/assets/item-socks-cat.png'),
  itemSocksOrange: require('@/assets/item-socks-orange.png'),
  itemSocksPink: require('@/assets/item-socks-pink.png'),
  itemSocksStripes: require('@/assets/item-socks-stripes.png'),
};

// Helper to get character image based on state, cue level, and correct item position
const getCharacterImage = (stateValue: string, cueLevel: number, correctItem: string): AssetKey => {
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
      return `gaze${formattedDirection}` as AssetKey;
    case 2:
      return `face${formattedDirection}` as AssetKey;
    case 3:
      return `point${formattedDirection}` as AssetKey;
    case 4:
      return 'neutral'; // Glow is on the item, character is neutral
    default:
      return 'neutral';
  }
};

const DraggableItem = ({ isCorrect, isGlowing, imageKey, onSelect, isAwaitingDrag, send }: any) => {
  const { height, width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(isAwaitingDrag && isCorrect)
    .onUpdate((event) => {
      x.value = event.translationX;
      y.value = event.translationY;
    })
    .onEnd((event) => {
      const characterDropZone = {
        minX: width / 2 - 75,
        maxX: width / 2 + 75,
        minY: height / 2 - 75,
        maxY: height / 2 + 75,
      };

      console.log('character drop zone', characterDropZone);

      // Note: The absolute coordinates are not directly available in the event.
      // This logic assumes the item starts centered and calculates drop based on translation.
      // A more robust solution might involve onLayout to get initial positions.
      const dropX = width / 2 + event.translationX;
      const dropY = height / 2 + event.translationY;

      if (
        dropX > characterDropZone.minX &&
        dropX < characterDropZone.maxX &&
        dropY > characterDropZone.minY &&
        dropY < characterDropZone.maxY
      ) {
        send({ type: 'DRAG_SUCCESSFUL' });
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value }, { translateY: y.value }],
      zIndex: isAwaitingDrag && isCorrect ? 1 : 0,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={onSelect}
          style={[styles.gameItemContainer, isGlowing && styles.glowingItem]}
          testID={`game-item-${imageKey}`}
          disabled={isAwaitingDrag}
        >
          <Image testID={`game-item-${imageKey}`} source={assets[imageKey]} style={styles.gameItem} contentFit="contain" />
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

// Helper to get game items based on difficulty and correct item
const getGameItems = (
  difficultyLevel: number,
  correctItem: string,
  cueLevel: number,
  send: Function,
  isAwaitingDrag: boolean
): React.ReactNode[] => {
  const items: JSX.Element[] = [];
  const imageKey: AssetKey = 'itemKettleBlue';

  const positions = difficultyLevel === 1 ? ['left', 'right'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  positions.forEach((position) => {
    const isCorrect = position === correctItem;
    const isGlowing = cueLevel === 4 && isCorrect;

    items.push(
      <DraggableItem
        key={position}
        isCorrect={isCorrect}
        isGlowing={isGlowing}
        imageKey={imageKey}
        onSelect={() => send({ type: 'SELECTION', selectedPosition: position })}
        isAwaitingDrag={isAwaitingDrag}
        send={send}
      />
    );
  });
  return items;
};

export default function GameScreen() {
  const router = useRouter();
  const [state, send] = useGame();
  useSound();

  const isAwaitingDrag = state.matches('awaitingDrag');
  const characterImageKey = getCharacterImage(state.value as string, state.context.cueLevel, state.context.correctItem);
  const gameItems = getGameItems(state.context.difficultyLevel, state.context.correctItem, state.context.cueLevel, send, isAwaitingDrag);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text>Game Screen</Text>
      <Text>Difficulty: {state.context.difficultyLevel}</Text>
      <Text>Cue: {state.context.cueLevel}</Text>
      <Text>State: {state.value as string}</Text>

      <Image
        testID={`character-image-${characterImageKey}`}
        source={assets[characterImageKey]}
        style={styles.characterImage}
        contentFit="contain"
      />

      {state.value !== 'introduction' && ( // Conditionally render items
        <View style={styles.itemsContainer}>{gameItems}</View>
      )}

      <Button title="End Session" onPress={() => router.back()} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  characterImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginVertical: 20,
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 20,
  },
  gameItemContainer: {
    margin: 10,
  },
  gameItem: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  glowingItem: {
    borderWidth: 3,
    borderColor: 'gold',
    borderRadius: 10,
  },
});
