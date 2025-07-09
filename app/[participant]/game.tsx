import React, { JSX } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGame } from '@/scripts/GameContext';
import { useSound } from '@/hooks/useSound';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useDragHandler } from '@/hooks/useDragHandler';
import { useGameEvents } from '@/hooks/useGameEvents';
import { trackEvent } from '@/scripts/analytics';
import { mapTouchEventToProps } from '@/scripts/utils';

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

interface DraggableItemProps {
  isCorrect: boolean;
  isGlowing: boolean;
  imageKey: AssetKey;
  onSelect: () => void;
  isAwaitingDrag: boolean;
  send: Function;
  characterBounds: { x: number; y: number; width: number; height: number } | null;
  itemPosition: string;
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
}: DraggableItemProps) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
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
    screenWidth,
    screenHeight,
    x,
    y,
    onDragSuccess: handleDragSuccess,
  });

  const handleItemLayout = React.useCallback(
    (event: any) => {
      console.debug('=== ITEM LAYOUT CALCULATION ===');
      const { width, height } = event.nativeEvent.layout;
      console.debug('Layout event:', { width, height });
      console.debug('Screen dimensions:', { screenWidth, screenHeight });

      // Calculate position based on the percentage styles we're using
      let estimatedX = 0;
      let estimatedY = 0;

      const itemWidth = screenWidth * 0.15; // 15% width from styles

      switch (itemPosition) {
        case 'left':
          estimatedX = screenWidth * 0.05; // 5% from left
          estimatedY = screenHeight * 0.45; // 45% from top
          break;
        case 'right':
          estimatedX = screenWidth * 0.95 - itemWidth; // right: 5% means 95% - item width
          estimatedY = screenHeight * 0.45;
          break;
        case 'top-left':
          estimatedX = screenWidth * 0.05;
          estimatedY = screenHeight * 0.1;
          break;
        case 'top-right':
          estimatedX = screenWidth * 0.95 - itemWidth;
          estimatedY = screenHeight * 0.1;
          break;
        case 'bottom-left':
          estimatedX = screenWidth * 0.05;
          estimatedY = screenHeight * 0.9 - itemWidth; // bottom: 10% means 90% - item height
          break;
        case 'bottom-right':
          estimatedX = screenWidth * 0.95 - itemWidth;
          estimatedY = screenHeight * 0.9 - itemWidth;
          break;
      }

      const bounds = { x: estimatedX, y: estimatedY, width: itemWidth, height: itemWidth };
      setItemBounds(bounds);
      console.debug('Item calculated bounds for', itemPosition, ':', bounds);
    },
    [itemPosition, screenWidth, screenHeight]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value }, { translateY: y.value }],
      zIndex: isAwaitingDrag && isCorrect ? 10 : 1,
    };
  });

  // Check if we're on web (for conditional behavior)
  const isWeb = typeof window !== 'undefined' && window.document;

  return (
    <View onLayout={handleItemLayout} style={{ width: '100%', height: '100%' }}>
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
  correctItem: string,
  cueLevel: number,
  send: Function,
  isAwaitingDrag: boolean,
  characterBounds: { x: number; y: number; width: number; height: number } | null
): React.ReactNode[] => {
  const items: JSX.Element[] = [];
  const imageKey: AssetKey = 'itemKettleBlue';

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
  const [state, send] = useGame();
  useSound();
  useGameEvents(participantId);
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
