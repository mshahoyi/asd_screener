import { event$ } from './eventStream';
import { db } from '../db';
import { gameEvents } from '../db/schema';

event$.subscribe((event) => {
  db.insert(gameEvents)
    .values({
      name: event.name as string,
      gameId: 123,
      participantId: event.participantId,
      timestamp: new Date(event.timestamp),
      properties: event.properties,
    })
    .catch((error) => {
      console.error('Error saving event to database', error);
      alert(error);
      throw error;
    });
});
