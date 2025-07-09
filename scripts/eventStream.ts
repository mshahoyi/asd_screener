import { Subject } from 'rxjs';

export type GameEvent = {
  name: string;
  participantId: number;
  gameId: number;
  properties?: unknown;
  timestamp: number;
};

export const event$ = new Subject<GameEvent>();
