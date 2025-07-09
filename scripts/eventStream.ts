import { Subject } from 'rxjs';

export type Event = {
  event: string;
  participantId: string;
  properties?: unknown;
  timestamp: number;
};

export const event$ = new Subject<Event>();
