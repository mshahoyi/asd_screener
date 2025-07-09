import { event$ } from './eventStream';

export function trackEvent(event: string, participantId: string, properties?: unknown) {
  const timestamp =
    typeof properties === 'object' && properties !== null && 'timestamp' in properties
      ? (properties as { timestamp: number }).timestamp
      : Date.now();
  event$.next({ event, participantId, properties, timestamp });
}
