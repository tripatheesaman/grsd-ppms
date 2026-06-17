CREATE TABLE `currency` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `currency_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `bidder`
  ADD COLUMN `bidCurrencyId` VARCHAR(191) NULL,
  ADD COLUMN `bidCurrencyCode` VARCHAR(191) NULL,
  ADD COLUMN `bidCurrencyName` VARCHAR(191) NULL,
  ADD COLUMN `bidCurrencySymbol` VARCHAR(191) NULL;

ALTER TABLE `bidder`
  ADD CONSTRAINT `bidder_bidCurrencyId_fkey`
  FOREIGN KEY (`bidCurrencyId`) REFERENCES `currency`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
