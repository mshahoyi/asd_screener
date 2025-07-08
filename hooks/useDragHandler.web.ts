import React from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { withSpring } from 'react-native-reanimated';
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
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const itemRef = React.useRef<any>(null);

  // Create a no-op gesture for web (since we use DOM events instead)
  const noOpGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(false) // Always disabled on web
        .onBegin(() => {})
        .onUpdate(() => {})
        .onEnd(() => {}),
    []
  );

  // Check collision detection
  const checkCollision = React.useCallback(
    (deltaX: number, deltaY: number): boolean => {
      if (!characterBounds || !itemBounds) {
        console.debug('Missing bounds for collision detection:', { characterBounds, itemBounds });
        return false;
      }

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

      console.debug('Web collision check:');
      console.debug('Character rectangle:', characterRect);
      console.debug('Item rectangle:', itemRect);

      const isOverlapping = !(
        itemRect.right < characterRect.left ||
        itemRect.left > characterRect.right ||
        itemRect.bottom < characterRect.top ||
        itemRect.top > characterRect.bottom
      );

      console.debug('Web overlap result:', isOverlapping);
      return isOverlapping;
    },
    [characterBounds, itemBounds, screenWidth, screenHeight]
  );

  // Web drag handlers
  const handleWebMouseDown = React.useCallback(
    (event: MouseEvent | TouchEvent) => {
      console.debug('=== WEB MOUSE DOWN EVENT ===');
      console.debug('Event type:', event.type);
      console.debug('isAwaitingDrag:', isAwaitingDrag);
      console.debug('isCorrect:', isCorrect);

      if (!isAwaitingDrag || !isCorrect) {
        console.debug('Early return due to conditions');
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      let clientX: number, clientY: number;

      if ('touches' in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
        console.debug('Touch event detected:', { clientX, clientY });
      } else if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
        console.debug('Mouse event detected:', { clientX, clientY });
      } else {
        console.debug('No valid coordinates found in event');
        return;
      }

      setIsDragging(true);
      setDragStart({ x: clientX, y: clientY });
      console.debug('Drag started successfully at:', { x: clientX, y: clientY });
      console.debug('=== END WEB MOUSE DOWN ===');
    },
    [isAwaitingDrag, isCorrect]
  );

  const handleWebMouseMove = React.useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragStart || !isAwaitingDrag || !isCorrect) return;

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

      console.debug('Web drag move - delta:', { deltaX, deltaY });
    },
    [isDragging, dragStart, isAwaitingDrag, isCorrect, x, y]
  );

  const handleWebMouseUp = React.useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragStart || !isAwaitingDrag || !isCorrect) return;

      console.debug('=== WEB MOUSE UP EVENT ===');

      let clientX: number, clientY: number;

      if ('changedTouches' in event && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
        console.debug('Touch end detected:', { clientX, clientY });
      } else if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
        console.debug('Mouse up detected:', { clientX, clientY });
      } else {
        console.debug('No valid coordinates in mouse up event');
        clientX = dragStart.x;
        clientY = dragStart.y;
      }

      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;

      console.debug('Web drag ended with delta:', { deltaX, deltaY });

      // Check collision
      if (checkCollision(deltaX, deltaY)) {
        console.debug('Web drag successful!');
        onDragSuccess();
      } else {
        console.debug('Web drag failed');
      }

      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      x.value = withSpring(0);
      y.value = withSpring(0);
      console.debug('=== WEB MOUSE UP COMPLETE ===');
    },
    [isDragging, dragStart, isAwaitingDrag, isCorrect, checkCollision, onDragSuccess, x, y]
  );

  // Setup DOM event listeners
  React.useEffect(() => {
    if (!isAwaitingDrag || !isCorrect) return;

    console.debug('=== SETTING UP WEB EVENT LISTENERS ===');
    console.debug('itemRef.current:', itemRef.current);

    const element = itemRef.current;
    if (!element) {
      console.debug('No element found to attach listeners');
      return;
    }

    let domNode = element;
    if (element._touchableNode) {
      domNode = element._touchableNode;
      console.debug('Using _touchableNode');
    } else if (element._nativeTag) {
      domNode = element;
      console.debug('Using element directly');
    }

    console.debug('Attaching listeners to DOM node:', domNode);

    const handleMouseDown = (e: MouseEvent) => {
      console.debug('DOM mousedown event fired');
      handleWebMouseDown(e);
    };
    const handleTouchStart = (e: TouchEvent) => {
      console.debug('DOM touchstart event fired');
      handleWebMouseDown(e);
    };

    domNode.addEventListener('mousedown', handleMouseDown);
    domNode.addEventListener('touchstart', handleTouchStart);

    return () => {
      console.debug('Removing web event listeners');
      domNode.removeEventListener('mousedown', handleMouseDown);
      domNode.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isAwaitingDrag, isCorrect, handleWebMouseDown]);

  // Setup global drag listeners
  React.useEffect(() => {
    if (!isDragging) return;

    console.debug('=== SETTING UP GLOBAL DRAG LISTENERS ===');

    const handleGlobalMouseMove = (e: MouseEvent) => handleWebMouseMove(e);
    const handleGlobalMouseUp = (e: MouseEvent) => handleWebMouseUp(e);
    const handleGlobalTouchMove = (e: TouchEvent) => handleWebMouseMove(e);
    const handleGlobalTouchEnd = (e: TouchEvent) => handleWebMouseUp(e);

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove);
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      console.debug('Removing global drag listeners');
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, handleWebMouseMove, handleWebMouseUp]);

  return {
    gesture: noOpGesture, // Return the no-op gesture for web
    itemRef,
    isDragging,
  };
}
