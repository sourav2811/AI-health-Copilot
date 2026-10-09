CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`mock_abha` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`filename` text NOT NULL,
	`object_key` text,
	`mime` text,
	`hash` text NOT NULL,
	`reviewed` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`model` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_records_user_created` ON `records` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_records_user_hash` ON `records` (`user_id`,`hash`);--> statement-breakpoint
CREATE TABLE `usage` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_usage_user_day` ON `usage` (`user_id`,`day`);