CREATE TABLE `publication_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `publications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL,
	`snapshot` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`size` integer NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `publications`(`id`) ON UPDATE no action ON DELETE no action
);
