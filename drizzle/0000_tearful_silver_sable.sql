CREATE TABLE `game_events` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`game_id` integer NOT NULL,
	`participant_id` integer NOT NULL,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`properties` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY NOT NULL,
	`participant_id` integer NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `item_clicks` (
	`id` integer PRIMARY KEY NOT NULL,
	`game_id` integer NOT NULL,
	`item` text NOT NULL,
	`position` text NOT NULL,
	`correct_position` text NOT NULL,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`cue_level` integer NOT NULL,
	`difficulty_level` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` integer PRIMARY KEY NOT NULL,
	`anonymous_id` text NOT NULL,
	`age` integer NOT NULL,
	`gender` text NOT NULL,
	`condition` text,
	`note` text
);
