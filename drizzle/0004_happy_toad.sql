ALTER TABLE `item_packages` ADD `import_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `item_packages_import_key_unique` ON `item_packages` (`import_key`);--> statement-breakpoint
ALTER TABLE `order_items` ADD `import_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `order_items_import_key_unique` ON `order_items` (`import_key`);--> statement-breakpoint
ALTER TABLE `orders` ADD `import_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_import_key_unique` ON `orders` (`import_key`);