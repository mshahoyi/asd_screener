import { db } from './index';
import { participants, games, gameEvents, itemClicks } from './schema';
import { eq, count } from 'drizzle-orm';

export type NewParticipant = typeof participants.$inferInsert;
export type Participant = typeof participants.$inferSelect;

export const createParticipant = async (participant: NewParticipant) => {
  return await db.insert(participants).values(participant).returning({ id: participants.id });
};

export const getParticipants = async () => {
  return await db.select().from(participants);
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
  return await db.insert(games).values({
    participantId,
    startedAt: new Date(),
  });
};

export const endGame = async (gameId: number) => {
  return await db.update(games).set({ endedAt: new Date() }).where(eq(games.id, gameId));
};
