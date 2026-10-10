CREATE TABLE `wish_capsules` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	`unlock_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `publications`(`id`) ON UPDATE no action ON DELETE no action
);
