import { db } from './index';
import { participants, games, gameEvents, itemClicks } from './schema';
import { eq, count } from 'drizzle-orm';

export type NewParticipant = typeof participants.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewItemClick = typeof itemClicks.$inferInsert;

export type ParticipantWithCounts = Participant & {
  gameCount: number;
  eventCount: number;
};

export const createParticipant = async (participant: NewParticipant) => {
  return await db.insert(participants).values(participant).returning({ id: participants.id });
};

export const getParticipants = async () => {
  const participantList = await db.select().from(participants);

  const participantsWithCounts = await Promise.all(
    participantList.map(async (participant) => {
      const gameCountResult = await db.select({ value: count() }).from(games).where(eq(games.participantId, participant.id));

      const eventCountResult = await db.select({ value: count() }).from(gameEvents).where(eq(gameEvents.participantId, participant.id));

      return {
        ...participant,
        gameCount: gameCountResult[0].value,
        eventCount: eventCountResult[0].value,
      };
    })
  );

  return participantsWithCounts;
};

export const getParticipantById = async (id: number) => {
  const result = await db.select().from(participants).where(eq(participants.id, id));
  return result[0];
};

export const updateParticipant = async (id: number, data: Partial<NewParticipant>) => {
  return await db.update(participants).set(data).where(eq(participants.id, id)).returning();
};

export const getGamesForParticipant = async (participantId: number) => {
  return await db.select().from(games).where(eq(games.participantId, participantId));
};

export const getTrialCountForGame = async (gameId: number) => {
  const result = await db.select({ value: count() }).from(itemClicks).where(eq(itemClicks.gameId, gameId));
  return result[0].value;
};

export const getEventCountForGame = async (gameId: number) => {
  const result = await db.select({ value: count() }).from(gameEvents).where(eq(gameEvents.gameId, gameId));
  return result[0].value;
};

export const startGame = async (participantId: number) => {
  return await db
    .insert(games)
    .values({
      participantId,
      startedAt: new Date(),
    })
    .returning({ id: games.id });
};

export const endGame = async (gameId: number) => {
  console.log('ending game', gameId);
  return await db.update(games).set({ endedAt: new Date() }).where(eq(games.id, gameId));
};

export const saveItemClick = (itemClick: NewItemClick) => {
  return db.insert(itemClicks).values(itemClick).returning({ id: itemClicks.id }).catch(alert);
};
