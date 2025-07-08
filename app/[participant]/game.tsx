import React, { JSX } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGame } from '@/scripts/GameContext';
import { useSound } from '@/hooks/useSound';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';

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
    console.log('=== DRAGGABLE ITEM STATE CHANGE ===');
    console.log('DraggableItem state:', { isAwaitingDrag, isCorrect, imageKey, itemPosition });
    console.log('Send function available:', typeof send);
    console.log('Character bounds available:', !!characterBounds);
    console.log('Item bounds available:', !!itemBounds);
    console.log('=== END STATE CHANGE ===');
  }, [isAwaitingDrag, isCorrect, imageKey, itemPosition, send, characterBounds, itemBounds]);

  // Create a JavaScript function that can be called from worklet
  const handleDragSuccess = React.useCallback(() => {
    console.log('=== DRAG SUCCESS HANDLER (JS THREAD) ===');
    console.log('About to call send with DRAG_SUCCESSFUL');
    console.log('Send function type:', typeof send);
    try {
      const result = send({ type: 'DRAG_SUCCESSFUL' });
      console.log('Send result:', result);
      console.log('DRAG_SUCCESSFUL event sent successfully');
    } catch (error) {
      console.error('Error in handleDragSuccess:', error);
    }
    console.log('=== END DRAG SUCCESS HANDLER ===');
  }, [send]);

  const handleItemLayout = React.useCallback(
    (event: any) => {
      console.log('=== ITEM LAYOUT CALCULATION ===');
      const { width, height } = event.nativeEvent.layout;
      console.log('Layout event:', { width, height });
      console.log('Screen dimensions:', { screenWidth, screenHeight });

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
      console.log('Item calculated bounds for', itemPosition, ':', bounds);
    },
    [itemPosition, screenWidth, screenHeight]
  );

  const gesture = Gesture.Pan()
    .enabled(isAwaitingDrag && isCorrect)
    .onBegin(() => {
      console.log('Gesture began for item:', imageKey, 'isCorrect:', isCorrect, 'position:', itemPosition);
    })
    .onUpdate((event) => {
      x.value = event.translationX;
      y.value = event.translationY;
    })
    .onEnd((event) => {
      'worklet';
      try {
        console.log('=== GESTURE END START (WORKLET) ===');
        console.log('Gesture ended:', event.translationX, event.translationY);
        console.log('isCorrect:', isCorrect);
        console.log('imageKey:', imageKey);
        console.log('itemPosition:', itemPosition);

        if (!characterBounds || !itemBounds) {
          console.log('Missing bounds data');
          console.log('Character:', characterBounds);
          console.log('Item:', itemBounds);
          x.value = withSpring(0);
          y.value = withSpring(0);
          console.log('=== GESTURE END - MISSING BOUNDS ===');
          return;
        }

        console.log('Bounds check passed');
        console.log('Character bounds:', JSON.stringify(characterBounds));
        console.log('Item bounds:', JSON.stringify(itemBounds));

        // Calculate the final position of the dragged item
        const finalItemX = itemBounds.x + event.translationX;
        const finalItemY = itemBounds.y + event.translationY;
        console.log('Final item position:', { x: finalItemX, y: finalItemY });

        // Character center point (remember character bounds are relative to its container)
        // Character container is at 20% from top, 20% from left, so we need to adjust
        const characterAbsoluteX = screenWidth * 0.2 + characterBounds.x;
        const characterAbsoluteY = screenHeight * 0.2 + characterBounds.y;
        const characterCenterX = characterAbsoluteX + characterBounds.width / 2;
        const characterCenterY = characterAbsoluteY + characterBounds.height / 2;
        console.log('Character absolute position:', { x: characterAbsoluteX, y: characterAbsoluteY });
        console.log('Character center calculated:', { x: characterCenterX, y: characterCenterY });

        // Calculate distance from item center to character center
        const itemCenterX = finalItemX + itemBounds.width / 2;
        const itemCenterY = finalItemY + itemBounds.height / 2;
        console.log('Item center calculated:', { x: itemCenterX, y: itemCenterY });

        const distance = Math.sqrt(Math.pow(itemCenterX - characterCenterX, 2) + Math.pow(itemCenterY - characterCenterY, 2));

        // Consider it a successful drop if within reasonable distance
        const dropThreshold = 120; // pixels - increased for easier dropping
        const isSuccessfulDrop = distance < dropThreshold;

        console.log('Drop check:');
        console.log('Item center:', { x: itemCenterX, y: itemCenterY });
        console.log('Character center:', { x: characterCenterX, y: characterCenterY });
        console.log('Distance:', distance, 'Threshold:', dropThreshold);
        console.log('Is successful:', isSuccessfulDrop);

        if (isSuccessfulDrop) {
          console.log('Drag successful! About to call JS function...');
          // Use runOnJS to call the JavaScript function from the worklet
          runOnJS(handleDragSuccess)();
        } else {
          console.log('Drag failed, returning to position');
        }

        // Always reset position
        console.log('Resetting position with spring animation...');
        x.value = withSpring(0);
        y.value = withSpring(0);
        console.log('Position reset completed');
        console.log('=== GESTURE END SUCCESS (WORKLET) ===');
      } catch (error) {
        console.log('=== GESTURE END ERROR (WORKLET) ===');
        console.log('Error in gesture onEnd:', error);
        x.value = withSpring(0);
        y.value = withSpring(0);
        console.log('=== GESTURE END ERROR RECOVERY (WORKLET) ===');
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value }, { translateY: y.value }],
      zIndex: isAwaitingDrag && isCorrect ? 10 : 1,
    };
  });

  return (
    <View onLayout={handleItemLayout} style={{ width: '100%', height: '100%' }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[animatedStyle, { height: '100%', width: '100%' }]}>
          <TouchableOpacity
            onPress={onSelect}
            style={[styles.gameItemTouchable, isGlowing && styles.glowingItem]}
            testID={`game-item-${imageKey}`}
            disabled={isAwaitingDrag}
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
  const [state, send] = useGame();
  useSound();
  const [characterBounds, setCharacterBounds] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Add effect to log state changes
  React.useEffect(() => {
    console.log('=== GAME STATE CHANGE ===');
    console.log('Current state:', state.value);
    console.log('State context:', JSON.stringify(state.context));
    console.log('State matches awaitingDrag:', state.matches('awaitingDrag'));
    console.log('Send function type:', typeof send);
    console.log('=== END GAME STATE CHANGE ===');
  }, [state]);

  const handleCharacterLayout = React.useCallback((event: any) => {
    console.log('=== CHARACTER LAYOUT ===');
    const { x, y, width, height } = event.nativeEvent.layout;
    const bounds = { x, y, width, height };
    setCharacterBounds(bounds);
    console.log('Character bounds set:', JSON.stringify(bounds));
    console.log('=== END CHARACTER LAYOUT ===');
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
    <GestureHandlerRootView style={styles.container}>
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
