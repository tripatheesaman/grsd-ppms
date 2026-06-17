CREATE TABLE `paymentcondition` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `paymentcondition_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `bidder`
  ADD COLUMN `paymentConditionId` VARCHAR(191) NULL,
  ADD COLUMN `paymentConditionCode` VARCHAR(191) NULL,
  ADD COLUMN `paymentConditionName` VARCHAR(191) NULL;

ALTER TABLE `bidder`
  ADD CONSTRAINT `bidder_paymentConditionId_fkey`
  FOREIGN KEY (`paymentConditionId`) REFERENCES `paymentcondition`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
