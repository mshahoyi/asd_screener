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

  // Add state for web drag handling
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);

  // Add ref to access the DOM element directly
  const itemRef = React.useRef<any>(null);

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

  // Check if we're on web
  const isWeb = typeof window !== 'undefined' && window.document;

  // Web-specific drag handlers with extensive logging
  const handleWebMouseDown = React.useCallback(
    (event: MouseEvent | TouchEvent) => {
      console.log('=== WEB MOUSE DOWN EVENT ===');
      console.log('Event type:', event.type);
      console.log('Event object:', event);
      console.log('isWeb:', isWeb);
      console.log('isAwaitingDrag:', isAwaitingDrag);
      console.log('isCorrect:', isCorrect);

      if (!isWeb || !isAwaitingDrag || !isCorrect) {
        console.log('Early return due to conditions');
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      let clientX: number, clientY: number;

      if ('touches' in event && event.touches.length > 0) {
        // Touch event
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
        console.log('Touch event detected:', { clientX, clientY });
      } else if ('clientX' in event) {
        // Mouse event
        clientX = event.clientX;
        clientY = event.clientY;
        console.log('Mouse event detected:', { clientX, clientY });
      } else {
        console.log('No valid coordinates found in event');
        return;
      }

      setIsDragging(true);
      setDragStart({ x: clientX, y: clientY });
      console.log('Drag started successfully at:', { x: clientX, y: clientY });
      console.log('=== END WEB MOUSE DOWN ===');
    },
    [isWeb, isAwaitingDrag, isCorrect]
  );

  const handleWebMouseMove = React.useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isWeb || !isDragging || !dragStart || !isAwaitingDrag || !isCorrect) return;

      let clientX: number, clientY: number;

      if ('touches' in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        return;
      }

      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;

      x.value = deltaX;
      y.value = deltaY;

      console.log('Web drag move - delta:', { deltaX, deltaY }, 'from', { clientX, clientY }, 'start', dragStart);
    },
    [isWeb, isDragging, dragStart, isAwaitingDrag, isCorrect, x, y]
  );

  const handleWebMouseUp = React.useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isWeb || !isDragging || !dragStart || !isAwaitingDrag || !isCorrect) return;

      console.log('=== WEB MOUSE UP EVENT ===');

      let clientX: number, clientY: number;

      if ('changedTouches' in event && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
        console.log('Touch end detected:', { clientX, clientY });
      } else if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
        console.log('Mouse up detected:', { clientX, clientY });
      } else {
        console.log('No valid coordinates in mouse up event');
        clientX = dragStart.x;
        clientY = dragStart.y;
      }

      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;

      console.log('Web drag ended with delta:', { deltaX, deltaY });

      // Perform collision detection
      if (characterBounds && itemBounds) {
        const finalItemX = itemBounds.x + deltaX;
        const finalItemY = itemBounds.y + deltaY;

        const characterAbsoluteX = screenWidth * 0.2 + characterBounds.x;
        const characterAbsoluteY = screenHeight * 0.2 + characterBounds.y;

        const characterRect = {
          left: characterAbsoluteX,
          top: characterAbsoluteY,
          right: characterAbsoluteX + characterBounds.width,
          bottom: characterAbsoluteY + characterBounds.height,
        };

        const itemRect = {
          left: finalItemX,
          top: finalItemY,
          right: finalItemX + itemBounds.width,
          bottom: finalItemY + itemBounds.height,
        };

        console.log('Web collision check:');
        console.log('Character rectangle:', characterRect);
        console.log('Item rectangle:', itemRect);

        const isOverlapping = !(
          itemRect.right < characterRect.left ||
          itemRect.left > characterRect.right ||
          itemRect.bottom < characterRect.top ||
          itemRect.top > characterRect.bottom
        );

        console.log('Web overlap result:', isOverlapping);

        if (isOverlapping) {
          console.log('Web drag successful!');
          handleDragSuccess();
        } else {
          console.log('Web drag failed');
        }
      } else {
        console.log('Missing bounds for collision detection:', { characterBounds, itemBounds });
      }

      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      x.value = withSpring(0);
      y.value = withSpring(0);
      console.log('=== WEB MOUSE UP COMPLETE ===');
    },
    [
      isWeb,
      isDragging,
      dragStart,
      isAwaitingDrag,
      isCorrect,
      characterBounds,
      itemBounds,
      screenWidth,
      screenHeight,
      handleDragSuccess,
      x,
      y,
    ]
  );

  // Add DOM event listeners for web
  React.useEffect(() => {
    if (!isWeb || !isAwaitingDrag || !isCorrect) return;

    console.log('=== SETTING UP WEB EVENT LISTENERS ===');
    console.log('itemRef.current:', itemRef.current);

    const element = itemRef.current;
    if (!element) {
      console.log('No element found to attach listeners');
      return;
    }

    // Get the actual DOM node
    let domNode = element;
    if (element._touchableNode) {
      domNode = element._touchableNode;
      console.log('Using _touchableNode');
    } else if (element._nativeTag) {
      // Try to find the DOM node through React Native Web
      domNode = element;
      console.log('Using element directly');
    }

    console.log('Attaching listeners to DOM node:', domNode);

    const handleMouseDown = (e: MouseEvent) => {
      console.log('DOM mousedown event fired');
      handleWebMouseDown(e);
    };
    const handleTouchStart = (e: TouchEvent) => {
      console.log('DOM touchstart event fired');
      handleWebMouseDown(e);
    };

    domNode.addEventListener('mousedown', handleMouseDown);
    domNode.addEventListener('touchstart', handleTouchStart);

    return () => {
      console.log('Removing web event listeners');
      domNode.removeEventListener('mousedown', handleMouseDown);
      domNode.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isWeb, isAwaitingDrag, isCorrect, handleWebMouseDown]);

  // Add global event listeners for move and up events
  React.useEffect(() => {
    if (!isWeb || !isDragging) return;

    console.log('=== SETTING UP GLOBAL DRAG LISTENERS ===');

    const handleGlobalMouseMove = (e: MouseEvent) => handleWebMouseMove(e);
    const handleGlobalMouseUp = (e: MouseEvent) => handleWebMouseUp(e);
    const handleGlobalTouchMove = (e: TouchEvent) => handleWebMouseMove(e);
    const handleGlobalTouchEnd = (e: TouchEvent) => handleWebMouseUp(e);

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove);
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      console.log('Removing global drag listeners');
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isWeb, isDragging, handleWebMouseMove, handleWebMouseUp]);

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
    .enabled(isAwaitingDrag && isCorrect && !isWeb) // Disable on web, use mouse events instead
    .onBegin(() => {
      console.log('Native gesture began for item:', imageKey, 'isCorrect:', isCorrect, 'position:', itemPosition);
    })
    .onUpdate((event) => {
      x.value = event.translationX;
      y.value = event.translationY;
    })
    .onEnd((event) => {
      'worklet';
      try {
        console.log('=== NATIVE GESTURE END START (WORKLET) ===');
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

        // Character absolute bounds (remember character bounds are relative to its container)
        // Character container is at 20% from top, 20% from left, so we need to adjust
        const characterAbsoluteX = screenWidth * 0.2 + characterBounds.x;
        const characterAbsoluteY = screenHeight * 0.2 + characterBounds.y;
        console.log('Character absolute position:', { x: characterAbsoluteX, y: characterAbsoluteY });

        // Define character rectangle
        const characterRect = {
          left: characterAbsoluteX,
          top: characterAbsoluteY,
          right: characterAbsoluteX + characterBounds.width,
          bottom: characterAbsoluteY + characterBounds.height,
        };

        // Define item rectangle at its final position
        const itemRect = {
          left: finalItemX,
          top: finalItemY,
          right: finalItemX + itemBounds.width,
          bottom: finalItemY + itemBounds.height,
        };

        console.log('Character rectangle:', characterRect);
        console.log('Item rectangle:', itemRect);

        // Check if rectangles overlap (collision detection)
        const isOverlapping = !(
          (
            itemRect.right < characterRect.left || // Item is to the left of character
            itemRect.left > characterRect.right || // Item is to the right of character
            itemRect.bottom < characterRect.top || // Item is above character
            itemRect.top > characterRect.bottom
          ) // Item is below character
        );

        console.log('Rectangle overlap check:');
        console.log('Is overlapping:', isOverlapping);

        if (isOverlapping) {
          console.log('Native drag successful! Item overlaps with character image');
          // Use runOnJS to call the JavaScript function from the worklet
          runOnJS(handleDragSuccess)();
        } else {
          console.log('Native drag failed, item does not overlap with character');
        }

        // Always reset position
        console.log('Resetting position with spring animation...');
        x.value = withSpring(0);
        y.value = withSpring(0);
        console.log('Position reset completed');
        console.log('=== NATIVE GESTURE END SUCCESS (WORKLET) ===');
      } catch (error) {
        console.log('=== NATIVE GESTURE END ERROR (WORKLET) ===');
        console.log('Error in gesture onEnd:', error);
        x.value = withSpring(0);
        y.value = withSpring(0);
        console.log('=== NATIVE GESTURE END ERROR RECOVERY (WORKLET) ===');
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
            ref={itemRef}
            onPress={onSelect}
            style={[styles.gameItemTouchable, isGlowing && styles.glowingItem]}
            testID={`game-item-${imageKey}`}
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
