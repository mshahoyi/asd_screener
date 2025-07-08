import React from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { withSpring, runOnJS } from 'react-native-reanimated';
import { DragHandlerProps, DragHandlerReturn } from './useDragHandler';

export function useDragHandler({
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
  onDragSuccess,
}: DragHandlerProps): DragHandlerReturn {
  // Check collision detection
  const checkCollision = React.useCallback(
    (translationX: number, translationY: number): boolean => {
      'worklet';
      if (!characterBounds || !itemBounds) {
        console.debug('Missing bounds data');
        return false;
      }

      // Calculate the final position of the dragged item
      const finalItemX = itemBounds.x + translationX;
      const finalItemY = itemBounds.y + translationY;

      // Character absolute bounds
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

      console.debug('Character rectangle:', characterRect);
      console.debug('Item rectangle:', itemRect);

      const isOverlapping = !(
        itemRect.right < characterRect.left ||
        itemRect.left > characterRect.right ||
        itemRect.bottom < characterRect.top ||
        itemRect.top > characterRect.bottom
      );

      console.debug('Rectangle overlap check:', isOverlapping);
      return isOverlapping;
    },
    [characterBounds, itemBounds, screenWidth, screenHeight]
  );

  const gesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(isAwaitingDrag && isCorrect)
        .onBegin(() => {
          console.debug('Native gesture began for item:', imageKey, 'isCorrect:', isCorrect, 'position:', itemPosition);
        })
        .onUpdate((event) => {
          x.value = event.translationX;
          y.value = event.translationY;
        })
        .onEnd((event) => {
          'worklet';
          try {
            console.debug('=== NATIVE GESTURE END START (WORKLET) ===');
            console.debug('Gesture ended:', event.translationX, event.translationY);
            console.debug('isCorrect:', isCorrect);
            console.debug('imageKey:', imageKey);
            console.debug('itemPosition:', itemPosition);

            if (!characterBounds || !itemBounds) {
              console.debug('Missing bounds data');
              x.value = withSpring(0);
              y.value = withSpring(0);
              return;
            }

            const isOverlapping = checkCollision(event.translationX, event.translationY);

            if (isOverlapping) {
              console.debug('Native drag successful! Item overlaps with character image');
              runOnJS(onDragSuccess)();
            } else {
              console.debug('Native drag failed, item does not overlap with character');
            }

            // Always reset position
            console.debug('Resetting position with spring animation...');
            x.value = withSpring(0);
            y.value = withSpring(0);
            console.debug('=== NATIVE GESTURE END SUCCESS (WORKLET) ===');
          } catch (error) {
            console.debug('=== NATIVE GESTURE END ERROR (WORKLET) ===');
            console.debug('Error in gesture onEnd:', error);
            x.value = withSpring(0);
            y.value = withSpring(0);
          }
        }),
    [isAwaitingDrag, isCorrect, imageKey, itemPosition, characterBounds, itemBounds, checkCollision, onDragSuccess, x, y]
  );

  return {
    gesture,
  };
}
