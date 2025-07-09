import { Subject } from 'rxjs';

export type Event = {
  name: string;
  participantId: string;
  properties?: unknown;
  timestamp: number;
};

export const event$ = new Subject<Event>();
