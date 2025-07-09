import { event$ } from './eventStream';

export function trackEvent(event: string, participantId: number, gameId: number, properties?: unknown) {
  const timestamp =
    typeof properties === 'object' && properties !== null && 'timestamp' in properties
      ? (properties as { timestamp: number }).timestamp
      : Date.now();
  event$.next({ name: event, participantId, gameId, properties, timestamp });
}
