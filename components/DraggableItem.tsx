import { Image } from 'expo-image';
import { useDragHandler } from '@/hooks/useDragHandler';
import React from 'react';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { CharacterAssetKey, characterAssets } from './gameUtils';

export const DraggableItem = ({
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
  const [itemBounds, setItemBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
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
            disabled={isAwaitingDrag && !isWeb}
          >
            <Image testID={`game-item-${imageKey}`} source={characterAssets[imageKey]} style={styles.gameItemImage} contentFit="contain" />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

interface DraggableItemProps {
  isCorrect: boolean;
  isGlowing: boolean;
  imageKey: CharacterAssetKey;
  onSelect: () => void;
  isAwaitingDrag: boolean;
  send: Function;
  characterBounds: { x: number; y: number; width: number; height: number } | null;
  itemPosition: string;
}

const styles = StyleSheet.create({
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
