CREATE TABLE `procurementpdimember` (
  `id` VARCHAR(191) NOT NULL,
  `procurementId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `designation` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `procurementpdimember_procurementId_idx`(`procurementId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `procurementpdimember`
  ADD CONSTRAINT `procurementpdimember_procurementId_fkey`
  FOREIGN KEY (`procurementId`) REFERENCES `procurement`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
