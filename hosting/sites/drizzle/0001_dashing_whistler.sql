CREATE TABLE `diary_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `publications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `guest_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`access_hash` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `publications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `publications` ADD `access_hash` text;--> statement-breakpoint
ALTER TABLE `publications` ADD `access_salt` text;--> statement-breakpoint
ALTER TABLE `publications` ADD `diary_email` text;--> statement-breakpoint
ALTER TABLE `publications` ADD `recipient_id` text;