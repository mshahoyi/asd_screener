import { db } from './index';
import { participants } from './schema';
import { eq } from 'drizzle-orm';

export type NewParticipant = typeof participants.$inferInsert;
export type Participant = typeof participants.$inferSelect;

export const createParticipant = async (participant: NewParticipant) => {
  return await db.insert(participants).values(participant).returning({ id: participants.id });
};

export const getParticipants = async () => {
  return await db.select().from(participants);
};

export const getParticipantById = async (id: number) => {
  return await db.select().from(participants).where(eq(participants.id, id));
};
