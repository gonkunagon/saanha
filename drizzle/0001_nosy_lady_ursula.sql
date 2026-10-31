ALTER TABLE `users` ADD `role` text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
-- บัญชีที่มีอยู่ก่อนมีระบบสิทธิ์ เป็นผู้ดูแลระบบทั้งหมด
UPDATE `users` SET `role` = 'admin';
