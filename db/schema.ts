import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const participants = sqliteTable('participants', {
  id: integer('id').primaryKey(),
  anonymousId: text('anonymous_id').notNull(),
  age: integer('age').notNull(),
  gender: text('gender').notNull(),
  condition: text('condition'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const games = sqliteTable('games', {
  id: integer('id').primaryKey(),
  participantId: integer('participant_id')
    .notNull()
    .references(() => participants.id),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
});

export const itemClicks = sqliteTable('item_clicks', {
  id: integer('id').primaryKey(),
  participantId: integer('participant_id')
    .notNull()
    .references(() => participants.id),
  gameId: integer('game_id')
    .notNull()
    .references(() => games.id),
  item: text('item').notNull(),
  position: text('position').notNull(),
  correctPosition: text('correct_position').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  cueLevel: integer('cue_level').notNull(),
  difficultyLevel: integer('difficulty_level').notNull(),
});

export const gameEvents = sqliteTable('game_events', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  gameId: integer('game_id')
    .notNull()
    .references(() => games.id),
  participantId: integer('participant_id')
    .notNull()
    .references(() => participants.id),
  timestamp: integer('timestamp', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  properties: text('properties', { mode: 'json' }),
});
