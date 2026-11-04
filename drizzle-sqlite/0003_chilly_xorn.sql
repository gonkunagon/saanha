CREATE TABLE `item_packages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`china_tracking_no` text,
	`boxes` integer,
	`weight_kg` real,
	`width_cm` real,
	`length_cm` real,
	`height_cm` real,
	`cbm` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- ย้ายขนาด/เลขพัสดุจีนของรายการเดิม ไปเป็นพัสดุแถวแรกของรายการนั้น ก่อนลบคอลัมน์เก่า
INSERT INTO `item_packages` (`item_id`, `china_tracking_no`, `boxes`, `weight_kg`, `width_cm`, `length_cm`, `height_cm`, `cbm`, `created_at`)
SELECT `id`, `china_tracking_no`, `boxes`, `weight_kg`, `width_cm`, `length_cm`, `height_cm`, `cbm`, `created_at`
FROM `order_items`
WHERE `china_tracking_no` IS NOT NULL OR `boxes` IS NOT NULL OR `weight_kg` IS NOT NULL OR `cbm` IS NOT NULL OR `width_cm` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `china_tracking_no`;--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `width_cm`;--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `length_cm`;--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `height_cm`;
