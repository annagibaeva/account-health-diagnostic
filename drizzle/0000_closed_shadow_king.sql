CREATE TABLE `operations` (
	`key` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shared_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shared_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	`actor` text NOT NULL,
	`updated_at` text NOT NULL
);
