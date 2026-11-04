ALTER TABLE `customers` ADD `code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `customers_code_unique` ON `customers` (`code`);--> statement-breakpoint
UPDATE `customers` SET `code` = 'C' || printf('%04d', `id`) WHERE `code` IS NULL;
