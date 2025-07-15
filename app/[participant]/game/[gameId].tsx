import React, { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Pressable, LayoutChangeEvent } from 'react-native';
import { Button } from 'react-native-paper';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useGame } from '@/scripts/GameContext';
import { useSound } from '@/hooks/useSound';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useDragHandler } from '@/hooks/useDragHandler';
import { useGameEvents } from '@/hooks/useGameEvents';
import { trackEvent } from '@/scripts/analytics';
import { mapTouchEventToProps } from '@/scripts/utils';
import { endGame } from '@/db/controller';
import { Ionicons } from '@expo/vector-icons';
import GameTimer from '@/components/GameTimer';
import { useGameTimers } from '@/hooks/useGameTimers';
import { itemOrder } from '@/scripts/gameState';

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
  pointBottomLeft: require('@/assets/point-bottom-left.jpg'),
  pointBottomRight: require('@/assets/point-bottom-right.jpg'),
  pointLeft: require('@/assets/point-left.jpg'),
  pointRight: require('@/assets/point-right.jpg'),
  pointTopLeft: require('@/assets/point-top-left.jpg'),
  pointTopRight: require('@/assets/point-top-right.jpg'),
  'item-kettle-blue': require('@/assets/item-kettle-blue.png'),
  'item-kettle-bronze': require('@/assets/item-kettle-bronze.png'),
  'item-kettle-gray': require('@/assets/item-kettle-gray.png'),
  'item-kettle-red': require('@/assets/item-kettle-red.png'),
  'item-socks-cat': require('@/assets/item-socks-cat.png'),
  'item-socks-orange': require('@/assets/item-socks-orange.png'),
  'item-socks-pink': require('@/assets/item-socks-pink.png'),
  'item-socks-stripes': require('@/assets/item-socks-stripes.png'),
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

interface DraggableItemProps {
  isCorrect: boolean;
  isGlowing: boolean;
  imageKey: AssetKey;
  onSelect: () => void;
  isAwaitingDrag: boolean;
  send: Function;
  characterBounds: { x: number; y: number; width: number; height: number } | null;
  itemPosition: string;
  positionStyle: any;
}

const DraggableItem = ({
  isCorrect,
  isGlowing,
  imageKey,
  onSelect,
  isAwaitingDrag,
  send,
  characterBounds,
  itemPosition,
  positionStyle,
}: DraggableItemProps) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [itemBounds, setItemBounds] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);

  React.useEffect(() => {
    console.debug('=== DRAGGABLE ITEM STATE CHANGE ===');
    console.debug('DraggableItem state:', { isAwaitingDrag, isCorrect, imageKey, itemPosition });
    console.debug('Send function available:', typeof send);
    console.debug('Character bounds available:', !!characterBounds);
    console.debug('Item bounds available:', !!itemBounds);
    console.debug('=== END STATE CHANGE ===');
  }, [isAwaitingDrag, isCorrect, imageKey, itemPosition, send, characterBounds, itemBounds]);

  // Handle drag success
  const handleDragSuccess = React.useCallback(() => {
    console.debug('=== DRAG SUCCESS HANDLER (JS THREAD) ===');
    console.debug('About to call send with DRAG_SUCCESSFUL');
    try {
      const result = send({ type: 'DRAG_SUCCESSFUL' });
      console.debug('Send result:', result);
      console.debug('DRAG_SUCCESSFUL event sent successfully');
    } catch (error) {
      console.error('Error in handleDragSuccess:', error);
    }
    console.debug('=== END DRAG SUCCESS HANDLER ===');
  }, [send]);

  // Use platform-specific drag handler
  const { gesture, itemRef, isDragging } = useDragHandler({
    isAwaitingDrag,
    isCorrect,
    itemPosition,
    imageKey,
    characterBounds,
    itemBounds,
    x,
    y,
    onDragSuccess: handleDragSuccess,
  });

  const handleItemLayout = React.useCallback((event: LayoutChangeEvent) => {
    console.debug('=== ITEM LAYOUT ===');
    const { x, y, width, height } = event.nativeEvent.layout;
    const bounds = { x, y, width, height };
    setItemBounds(bounds);
    console.debug('Item bounds set:', JSON.stringify(bounds));
    console.debug('=== END ITEM LAYOUT ===');
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value }, { translateY: y.value }],
      zIndex: isAwaitingDrag && isCorrect ? 10 : 1,
    };
  });

  // Check if we're on web (for conditional behavior)
  const isWeb = typeof window !== 'undefined' && window.document;

  return (
    <View onLayout={handleItemLayout} style={[styles.gameItemContainer, positionStyle]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[animatedStyle, { height: '100%', width: '100%' }]}>
          <TouchableOpacity
            ref={itemRef}
            onPress={onSelect}
            style={[styles.gameItemTouchable, isGlowing && styles.glowingItem]}
            testID={`game-item-${itemPosition}`}
            disabled={isAwaitingDrag && !isWeb} // Don't disable on web since we handle drag differently
          >
            <Image testID={`game-item-${imageKey}`} source={assets[imageKey]} style={styles.gameItemImage} contentFit="contain" />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

// Helper to get game items based on difficulty and correct item
const getGameItems = (
  difficultyLevel: number,
  itemName: string,
  correctItem: string,
  cueLevel: number,
  send: Function,
  isAwaitingDrag: boolean,
  characterBounds: { x: number; y: number; width: number; height: number } | null
): React.ReactNode[] => {
  const items: JSX.Element[] = [];
  const imageKey: AssetKey = `item-${itemName}` as AssetKey;

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
      <DraggableItem
        isCorrect={isCorrect}
        isGlowing={isGlowing}
        imageKey={imageKey}
        onSelect={() => send({ type: 'SELECTION', selectedPosition: position })}
        isAwaitingDrag={isAwaitingDrag}
        send={send}
        characterBounds={characterBounds}
        itemPosition={position}
        positionStyle={positionStyle}
        key={position}
      />
    );
  });
  return items;
};

export default function GameScreen() {
  useGameTimers();
  const router = useRouter();
  const { participant, gameId } = useLocalSearchParams<{ participant: string; gameId: string }>();
  const participantId = parseInt(participant, 10);
  const gameIdNumber = parseInt(gameId, 10);
  const [state, send] = useGame();
  useSound();
  useGameEvents(participantId, gameIdNumber);
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
    itemOrder[state.context.currentItemIndex],
    state.context.correctItem,
    state.context.cueLevel,
    send,
    isAwaitingDrag,
    characterBounds
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />

      <GestureHandlerRootView
        style={styles.container}
        onTouchStart={(e) => trackEvent('touch_start', participantId, gameIdNumber, mapTouchEventToProps(e))}
        onTouchMove={(e) => trackEvent('touch_move', participantId, gameIdNumber, mapTouchEventToProps(e))}
        onTouchEnd={(e) => trackEvent('touch_end', participantId, gameIdNumber, mapTouchEventToProps(e))}
      >
        {!!__DEV__ && (
          <View style={{ position: 'absolute', top: 40, left: 0, right: 0 }}>
            <Text style={styles.gameInfo}>{state.value as string}</Text>
            <Text style={styles.gameInfo}>{JSON.stringify(state.context, null, 2)}</Text>
          </View>
        )}

        {/* Character in center */}
        <View style={styles.characterContainer} onLayout={handleCharacterLayout}>
          <Image
            testID={`character-image-${characterImageKey}`}
            source={assets[characterImageKey]}
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

        {/* End game button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            zIndex: 1000,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            opacity: 0.5,
          }}
        >
          <GameTimer />

          <Pressable
            testID="end-session-button"
            onPress={() =>
              endGame(gameIdNumber)
                .then(() => router.back())
                .catch(alert)
            }
          >
            <Ionicons name="close" size={32} color="black" />
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </>
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
    height: '100%',
    width: '100%',
    zIndex: 1,
  },
  gameItemContainer: {
    position: 'absolute',
    width: '15%', // Increased from 10% to make items more visible
    aspectRatio: 1,
  },
  gameItemTouchable: {
    width: '100%',
    height: '100%',
  },
  gameItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  glowingItem: {
    borderWidth: 3,
    borderColor: 'gold',
    borderRadius: 10,
  },
});
