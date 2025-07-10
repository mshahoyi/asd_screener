import { SharedValue } from 'react-native-reanimated';

export interface DragHandlerProps {
  isAwaitingDrag: boolean;
  isCorrect: boolean;
  itemPosition: string;
  imageKey: string;
  characterBounds: { x: number; y: number; width: number; height: number } | null;
  itemBounds: { x: number; y: number; width: number; height: number } | null;
  x: SharedValue<number>;
  y: SharedValue<number>;
  onDragSuccess: () => void;
}

export interface DragHandlerReturn {
  gesture?: any; // Native gesture handler
  itemRef?: React.RefObject<any>; // Web DOM ref
  isDragging?: boolean; // Web drag state
}

export declare function useDragHandler(props: DragHandlerProps): DragHandlerReturn;
