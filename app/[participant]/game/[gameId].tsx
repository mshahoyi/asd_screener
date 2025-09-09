import React, { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Pressable, LayoutChangeEvent, AppState } from 'react-native';
import { Button } from 'react-native-paper';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useGame } from '@/scripts/GameContext';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { useDragHandler } from '@/hooks/useDragHandler';
import { useGameEvents } from '@/hooks/useGameEvents';
import { trackEvent } from '@/scripts/analytics';
import { mapTouchEventToProps } from '@/scripts/utils';
import { endGame, saveItemClick } from '@/db/controller';
import { Ionicons } from '@expo/vector-icons';
import GameTimer from '@/components/GameTimer';
import { useGameTimers } from '@/hooks/useGameTimers';
import { itemOrder } from '@/scripts/gameState';
import { GameVideo } from '@/components/GameVideo';

// Import all assets dynamically
type AssetKey = keyof typeof assets;

const assets = {
  // videos

  // images
  bgDl1: require('@/assets/bg-2-item.jpeg'),
  bgDl2: require('@/assets/bg-4-item.jpeg'),
  'item-kettle-blue': require('@/assets/item-kettle-blue.png'),
  'item-kettle-bronze': require('@/assets/item-kettle-bronze.png'),
  'item-kettle-gray': require('@/assets/item-kettle-gray.png'),
  'item-kettle-red': require('@/assets/item-kettle-red.png'),
  'item-socks-cat': require('@/assets/item-socks-cat.png'),
  'item-socks-orange': require('@/assets/item-socks-orange.png'),
  'item-socks-pink': require('@/assets/item-socks-pink.png'),
  'item-socks-stripes': require('@/assets/item-socks-stripes.png'),
  'item-lamp-dark': require('@/assets/item-lamp-dark.png'),
  'item-lamp-light': require('@/assets/item-lamp-light.png'),
  'item-bowl-blue': require('@/assets/item-bowl-blue.png'),
  'item-bowl-yellow': require('@/assets/item-bowl-yellow.png'),
  'item-ball-football': require('@/assets/item-ball-football.png'),
  'item-ball-colorfull': require('@/assets/item-ball-colorfull.png'),
  'item-book-yellow': require('@/assets/item-book-yellow.png'),
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

  // Animation for glowing effect
  const glowAnimation = useSharedValue(0);

  // Start/stop glow animation based on isGlowing prop
  React.useEffect(() => {
    if (isGlowing) {
      glowAnimation.value = withRepeat(
        withTiming(1, { duration: 800 }),
        -1, // infinite
        true // reverse
      );
    } else {
      glowAnimation.value = withTiming(0, { duration: 200 });
    }
  }, [isGlowing]);

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

  // Animated glow style
  const glowStyle = useAnimatedStyle(() => {
    const scale = interpolate(glowAnimation.value, [0, 1], [1, 1.1]);
    const shadowOpacity = interpolate(glowAnimation.value, [0, 1], [0.3, 0.8]);
    const shadowRadius = interpolate(glowAnimation.value, [0, 1], [16, 32]);

    return {
      transform: [{ scale }],
      shadowColor: '#FFD700', // Gold color
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isGlowing ? shadowOpacity : 0,
      shadowRadius: isGlowing ? shadowRadius : 0,
      elevation: isGlowing ? 8 : 0, // For Android
    };
  });

  // Check if we're on web (for conditional behavior)
  const isWeb = typeof window !== 'undefined' && window.document;

  return (
    <View onLayout={handleItemLayout} style={[styles.gameItemContainer, positionStyle]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[animatedStyle, { height: '100%', width: '100%' }]}>
          <Animated.View style={[glowStyle, { height: '100%', width: '100%' }]}>
            <TouchableOpacity
              ref={itemRef}
              onPress={onSelect}
              style={[styles.gameItemTouchable]}
              testID={`game-item-${itemPosition}`}
              disabled={isAwaitingDrag && !isWeb} // Don't disable on web since we handle drag differently
            >
              <Image testID={`game-item-${imageKey}`} source={assets[imageKey]} style={styles.gameItemImage} contentFit="contain" />
            </TouchableOpacity>
          </Animated.View>
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
  characterBounds: { x: number; y: number; width: number; height: number } | null,
  participantId: number,
  gameId: number
): React.ReactNode[] => {
  const items: JSX.Element[] = [];
  const imageKey: AssetKey = `item-${itemName}` as AssetKey;

  const positions = difficultyLevel === 1 ? ['left', 'right'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  const getPositionStyle = (position: string): any => {
    switch (position) {
      case 'left':
        return { left: '4%', top: '35%' };
      case 'right':
        return { right: '4%', top: '35%' };
      case 'top-left':
        return { left: '4%', top: '15%' };
      case 'top-right':
        return { right: '4%', top: '15%' };
      case 'bottom-left':
        return { left: '4%', bottom: '20%' };
      case 'bottom-right':
        return { right: '4%', bottom: '20%' };
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
        onSelect={() => {
          saveItemClick({
            participantId,
            gameId,
            item: itemName,
            position,
            correctPosition: correctItem,
            cueLevel,
            difficultyLevel,
          });

          send({ type: 'SELECTION', selectedPosition: position });
        }}
        isAwaitingDrag={isAwaitingDrag}
        send={send}
        characterBounds={characterBounds}
        itemPosition={position}
        positionStyle={positionStyle}
        key={`${position}-${itemName}`}
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
  const [state, send, actor] = useGame();
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

  // Track app state changes (background/foreground)
  React.useEffect(() => {
    // Track game screen mount
    trackEvent('game_screen_mount', participantId, gameIdNumber, {
      ...actor.getSnapshot().context,
      gameState: actor.getSnapshot().value,
      timestamp: Date.now(),
    });

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        trackEvent('app_background', participantId, gameIdNumber, {
          ...actor.getSnapshot().context,
          gameState: actor.getSnapshot().value,
          timestamp: Date.now(),
        });
      } else if (nextAppState === 'active') {
        trackEvent('app_foreground', participantId, gameIdNumber, {
          ...actor.getSnapshot().context,
          gameState: actor.getSnapshot().value,
          timestamp: Date.now(),
        });
      } else if (nextAppState === 'inactive') {
        trackEvent('app_inactive', participantId, gameIdNumber, {
          ...actor.getSnapshot().context,
          gameState: actor.getSnapshot().value,
          timestamp: Date.now(),
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Track initial app state
    trackEvent('app_state_initial', participantId, gameIdNumber, {
      ...actor.getSnapshot().context,
      appState: AppState.currentState,
      gameState: actor.getSnapshot().value,
      timestamp: Date.now(),
    });

    return () => {
      // Track game screen unmount
      trackEvent('game_screen_unmount', participantId, gameIdNumber, {
        ...actor.getSnapshot().context,
        gameState: actor.getSnapshot().value,
        timestamp: Date.now(),
      });

      subscription?.remove();
    };
  }, []);

  const handleCharacterLayout = React.useCallback((event: any) => {
    console.debug('=== CHARACTER LAYOUT ===');
    const { x, y, width, height } = event.nativeEvent.layout;
    const bounds = { x, y, width, height };
    setCharacterBounds(bounds);
    console.debug('Character bounds set:', JSON.stringify(bounds));
    console.debug('=== END CHARACTER LAYOUT ===');
  }, []);

  const isAwaitingDrag = state.matches('awaitingDrag');
  const gameItems = getGameItems(
    state.context.difficultyLevel,
    itemOrder[state.context.currentItemIndex],
    state.context.correctItem,
    state.context.cueLevel,
    send,
    isAwaitingDrag,
    characterBounds,
    participantId,
    gameIdNumber
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
        {/* Background Image */}
        <Image
          source={state.context.difficultyLevel == 1 ? assets.bgDl1 : assets.bgDl2}
          style={styles.backgroundImage}
          contentFit="cover"
        />

        {/* Character in center */}
        <GameVideo handleCharacterLayout={handleCharacterLayout} />

        {/* Items positioned around character */}
        {state.value !== 'introduction' && state.value !== 'sessionEnded' && <View style={styles.gameArea}>{gameItems}</View>}

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
            onPress={() => {
              trackEvent('manual_game_end', participantId, gameIdNumber, {
                ...actor.getSnapshot().context,
                gameState: state.value,
                timestamp: Date.now(),
              });

              endGame(gameIdNumber)
                .then(() => router.back())
                .catch(alert);
            }}
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
    backgroundColor: 'white',
  },
  gameInfo: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 2,
  },
  dropZoneIndicator: {
    position: 'absolute',
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
    borderRadius: 10, // Add border radius for better shadow effect
  },
  gameItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
});
