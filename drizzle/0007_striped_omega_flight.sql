ALTER TABLE `orders` ADD `shop_name` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `currency` text DEFAULT 'THB' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `total_amount` real;--> statement-breakpoint
ALTER TABLE `orders` ADD `deposit_amount` real;