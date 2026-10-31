CREATE TABLE `session_owner` (
  `session_id` text PRIMARY KEY NOT NULL REFERENCES `session`(`id`) ON DELETE CASCADE,
  `instance_id` text NOT NULL,
  `pid` integer NOT NULL,
  `time_claimed` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX `session_owner_instance_idx` ON `session_owner` (`instance_id`);--> statement-breakpoint
CREATE TABLE `inbox_wake` (
  `session_id` text NOT NULL REFERENCES `session`(`id`) ON DELETE CASCADE,
  `agent_id` text NOT NULL,
  `time_created` integer NOT NULL,
  PRIMARY KEY (`session_id`, `agent_id`)
);
