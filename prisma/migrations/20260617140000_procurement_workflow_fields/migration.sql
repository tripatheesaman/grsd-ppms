-- Workflow custom fields per stage with anchor positioning
CREATE TABLE `procurementworkflowfield` (
    `id` VARCHAR(191) NOT NULL,
    `stageKey` VARCHAR(191) NOT NULL,
    `fieldKey` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `fieldType` VARCHAR(191) NOT NULL DEFAULT 'TEXT',
    `optionsJson` JSON NULL,
    `anchorFieldKey` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL DEFAULT 'AFTER',
    `sortOrder` INT NOT NULL DEFAULT 0,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `hint` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `procurementworkflowfield_stageKey_fieldKey_key`(`stageKey`, `fieldKey`),
    INDEX `procurementworkflowfield_stageKey_isActive_idx`(`stageKey`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `procurementworkflowfieldvalue` (
    `id` VARCHAR(191) NOT NULL,
    `procurementId` VARCHAR(191) NOT NULL,
    `fieldId` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `procurementworkflowfieldvalue_procurementId_fieldId_key`(`procurementId`, `fieldId`),
    INDEX `procurementworkflowfieldvalue_procurementId_idx`(`procurementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `procurementworkflowfieldvalue` ADD CONSTRAINT `procurementworkflowfieldvalue_procurementId_fkey` FOREIGN KEY (`procurementId`) REFERENCES `procurement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `procurementworkflowfieldvalue` ADD CONSTRAINT `procurementworkflowfieldvalue_fieldId_fkey` FOREIGN KEY (`fieldId`) REFERENCES `procurementworkflowfield`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
