import { GestureResponderEvent } from 'react-native';

export function mapTouchEventToProps(event: GestureResponderEvent) {
  const touch = event.nativeEvent;
  const touchPoint = touch.changedTouches?.[0] || touch;

  return {
    // Touch data
    identifier: touchPoint.identifier ?? null,
    target: touchPoint.target ?? null,
    locationX: touchPoint.locationX ?? null,
    locationY: touchPoint.locationY ?? null,
    pageX: touchPoint.pageX ?? null,
    pageY: touchPoint.pageY ?? null,
    force: touchPoint.force ?? null,
    // Timestamp (ms resolution)
    timestamp: typeof event.timeStamp === 'number' ? event.timeStamp : Date.now(), // fallback if needed
  };
}
