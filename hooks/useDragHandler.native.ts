import React from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { withSpring, runOnJS } from 'react-native-reanimated';
import { DragHandlerProps, DragHandlerReturn } from './useDragHandler';
import { trackEvent } from '@/scripts/analytics';
import { useLocalSearchParams } from 'expo-router';

export function useDragHandler({
  isAwaitingDrag,
  isCorrect,
  itemPosition,
  imageKey,
  characterBounds,
  itemBounds,
  x,
  y,
  onDragSuccess,
}: DragHandlerProps): DragHandlerReturn {
  const { participant, gameId } = useLocalSearchParams<{ participant: string; gameId: string }>();
  const participantId = parseInt(participant, 10);
  const gameIdNumber = parseInt(gameId, 10);

  // Check collision detection
  const checkCollision = React.useCallback(
    (centerX: number, centerY: number): boolean => {
      'worklet';
      if (!characterBounds || !itemBounds) {
        console.debug('Missing bounds data');
        return false;
      }

      console.debug('Received character bounds:', characterBounds);
      console.debug('Received item bounds:', itemBounds);

      const characterRect = {
        left: characterBounds.x,
        top: characterBounds.y,
        right: characterBounds.x + characterBounds.width,
        bottom: characterBounds.y + characterBounds.height,
      };

      const isOverlapping = !(
        centerX < characterRect.left ||
        centerX > characterRect.right ||
        centerY < characterRect.top ||
        centerY > characterRect.bottom
      );

      console.debug('Rectangle overlap check:', isOverlapping);
      return isOverlapping;
    },
    [characterBounds, itemBounds]
  );

  const gesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(isAwaitingDrag && isCorrect)
        .onBegin((event) => {
          console.debug('Native gesture began for item:', imageKey, 'isCorrect:', isCorrect, 'position:', itemPosition);
          runOnJS(trackEvent)('pan_handler_begin', participantId, gameIdNumber, event);
        })
        .onUpdate((event) => {
          x.value = event.translationX;
          y.value = event.translationY;
          runOnJS(trackEvent)('pan_handler_update', participantId, gameIdNumber, event);
        })
        .onEnd((event) => {
          'worklet';

          runOnJS(trackEvent)('pan_handler_end', participantId, gameIdNumber, event);

          try {
            console.debug('=== NATIVE GESTURE END START (WORKLET) ===');
            console.debug('Gesture ended:', event.absoluteX, event.absoluteY);
            console.debug('isCorrect:', isCorrect);
            console.debug('imageKey:', imageKey);
            console.debug('itemPosition:', itemPosition);

            if (!characterBounds || !itemBounds) {
              console.debug('Missing bounds data');
              x.value = withSpring(0);
              y.value = withSpring(0);
              return;
            }

            const centerX = event.absoluteX; // absoluteX is the center of the item
            const centerY = event.absoluteY; // absoluteY is the center of the item
            const isOverlapping = checkCollision(centerX, centerY);

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
