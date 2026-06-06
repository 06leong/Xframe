ALTER TABLE `photos` ADD `public_slug` text;
CREATE UNIQUE INDEX `photos_public_slug_unique` ON `photos` (`public_slug`);
