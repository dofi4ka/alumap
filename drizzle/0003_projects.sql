CREATE TABLE `projects` (
	`id` integer PRIMARY KEY NOT NULL,
	`nano_id` text NOT NULL,
	`owner_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image_id` text,
	`donation_url` text,
	`fundraising_goal` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_nanoId_unique` ON `projects` (`nano_id`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`,`created_at`);