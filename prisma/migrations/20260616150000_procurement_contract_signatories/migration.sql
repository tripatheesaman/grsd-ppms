ALTER TABLE `procurement`
  ADD COLUMN `supplierWitnessName` VARCHAR(191) NULL,
  ADD COLUMN `supplierWitnessDesignation` VARCHAR(191) NULL,
  ADD COLUMN `supplierSigningAuthorityName` VARCHAR(191) NULL,
  ADD COLUMN `supplierSigningAuthorityDesignation` VARCHAR(191) NULL;
