-- Denormalize procurement child rows so master lookups/templates can be deleted safely.

-- Procurement references: keep type label/code on the row
ALTER TABLE `procurementreference` ADD COLUMN `typeName` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `procurementreference` ADD COLUMN `typeCode` VARCHAR(191) NOT NULL DEFAULT '';

UPDATE `procurementreference` pr
INNER JOIN `referencetype` rt ON pr.`referenceTypeId` = rt.`id`
SET pr.`typeName` = rt.`name`, pr.`typeCode` = rt.`code`;

ALTER TABLE `procurementreference` DROP FOREIGN KEY `procurementreference_referenceTypeId_fkey`;
ALTER TABLE `procurementreference` MODIFY `referenceTypeId` VARCHAR(191) NULL;
ALTER TABLE `procurementreference`
  ADD CONSTRAINT `procurementreference_referenceTypeId_fkey`
  FOREIGN KEY (`referenceTypeId`) REFERENCES `referencetype`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Work day categories on procurements: keep category name on the row
ALTER TABLE `procurementworkdaycategory` ADD COLUMN `categoryName` VARCHAR(191) NOT NULL DEFAULT '';

UPDATE `procurementworkdaycategory` pwc
INNER JOIN `workdaycategory` wdc ON pwc.`workDayCategoryId` = wdc.`id`
SET pwc.`categoryName` = wdc.`name`;

ALTER TABLE `procurementworkdaycategory` DROP FOREIGN KEY `procurementworkdaycategory_workDayCategoryId_fkey`;
ALTER TABLE `procurementworkdaycategory` MODIFY `workDayCategoryId` VARCHAR(191) NULL;
ALTER TABLE `procurementworkdaycategory`
  ADD CONSTRAINT `procurementworkdaycategory_workDayCategoryId_fkey`
  FOREIGN KEY (`workDayCategoryId`) REFERENCES `workdaycategory`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Generated documents: keep template metadata; allow template deletion
ALTER TABLE `generateddocument` ADD COLUMN `templateName` VARCHAR(191) NULL;
ALTER TABLE `generateddocument` ADD COLUMN `templateType` ENUM('NOTICE', 'LOI_PASS', 'LOI_FAIL', 'LOI_WINNER', 'LOA', 'CONTRACT') NULL;

UPDATE `generateddocument` gd
INNER JOIN `documenttemplate` dt ON gd.`templateId` = dt.`id`
SET gd.`templateName` = dt.`name`, gd.`templateType` = dt.`type`;

ALTER TABLE `generateddocument` DROP FOREIGN KEY `generateddocument_templateId_fkey`;
ALTER TABLE `generateddocument` MODIFY `templateId` VARCHAR(191) NULL;
ALTER TABLE `generateddocument`
  ADD CONSTRAINT `generateddocument_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `documenttemplate`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Bidder custom fields: keep field key/label on the value row
ALTER TABLE `bidderfieldvalue` ADD COLUMN `fieldKey` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `bidderfieldvalue` ADD COLUMN `fieldLabel` VARCHAR(191) NOT NULL DEFAULT '';

UPDATE `bidderfieldvalue` bfv
INNER JOIN `bidderfielddefinition` bfd ON bfv.`fieldId` = bfd.`id`
SET bfv.`fieldKey` = bfd.`key`, bfv.`fieldLabel` = bfd.`label`;

ALTER TABLE `bidderfieldvalue` DROP FOREIGN KEY `bidderfieldvalue_fieldId_fkey`;
ALTER TABLE `bidderfieldvalue` MODIFY `fieldId` VARCHAR(191) NULL;
ALTER TABLE `bidderfieldvalue`
  ADD CONSTRAINT `bidderfieldvalue_fieldId_fkey`
  FOREIGN KEY (`fieldId`) REFERENCES `bidderfielddefinition`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
