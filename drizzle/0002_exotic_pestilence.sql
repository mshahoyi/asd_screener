PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_game_events` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`game_id` integer NOT NULL,
	`participant_id` integer NOT NULL,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	`properties` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_game_events`("id", "name", "game_id", "participant_id", "timestamp", "properties") SELECT "id", "name", "game_id", "participant_id", "timestamp", "properties" FROM `game_events`;--> statement-breakpoint
DROP TABLE `game_events`;--> statement-breakpoint
ALTER TABLE `__new_game_events` RENAME TO `game_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_item_clicks` (
	`id` integer PRIMARY KEY NOT NULL,
	`participant_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`item` text NOT NULL,
	`position` text NOT NULL,
	`correct_position` text NOT NULL,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	`cue_level` integer NOT NULL,
	`difficulty_level` integer NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_item_clicks`("id", "participant_id", "game_id", "item", "position", "correct_position", "timestamp", "cue_level", "difficulty_level") SELECT "id", "participant_id", "game_id", "item", "position", "correct_position", "timestamp", "cue_level", "difficulty_level" FROM `item_clicks`;--> statement-breakpoint
DROP TABLE `item_clicks`;--> statement-breakpoint
ALTER TABLE `__new_item_clicks` RENAME TO `item_clicks`;--> statement-breakpoint
CREATE TABLE `__new_participants` (
	`id` integer PRIMARY KEY NOT NULL,
	`anonymous_id` text NOT NULL,
	`age` integer NOT NULL,
	`gender` text NOT NULL,
	`condition` text,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_participants`("id", "anonymous_id", "age", "gender", "condition", "note", "created_at") SELECT "id", "anonymous_id", "age", "gender", "condition", "note", "created_at" FROM `participants`;--> statement-breakpoint
DROP TABLE `participants`;--> statement-breakpoint
ALTER TABLE `__new_participants` RENAME TO `participants`;