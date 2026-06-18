-- Per-stage field display order (builtin + custom)
CREATE TABLE `procurementworkflowfieldorder` (
    `id` VARCHAR(191) NOT NULL,
    `stageKey` VARCHAR(191) NOT NULL,
    `fieldRef` VARCHAR(191) NOT NULL,
    `sortOrder` INT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `procurementworkflowfieldorder_stageKey_fieldRef_key`(`stageKey`, `fieldRef`),
    INDEX `procurementworkflowfieldorder_stageKey_sortOrder_idx`(`stageKey`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Document template slots per workflow stage
CREATE TABLE `procurementstagetemplateslot` (
    `id` VARCHAR(191) NOT NULL,
    `stageKey` VARCHAR(191) NOT NULL,
    `slotKey` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `documentType` ENUM('NOTICE', 'LOI_PASS', 'LOI_FAIL', 'LOI_WINNER', 'LOA', 'CONTRACT') NULL,
    `bidTypeScoped` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INT NOT NULL DEFAULT 0,
    `isBuiltin` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `procurementstagetemplateslot_stageKey_slotKey_key`(`stageKey`, `slotKey`),
    INDEX `procurementstagetemplateslot_stageKey_isActive_idx`(`stageKey`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `documenttemplate` ADD COLUMN `stageTemplateSlotId` VARCHAR(191) NULL;

ALTER TABLE `documenttemplate` ADD CONSTRAINT `documenttemplate_stageTemplateSlotId_fkey` FOREIGN KEY (`stageTemplateSlotId`) REFERENCES `procurementstagetemplateslot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed built-in template slots mapped to workflow stages
INSERT INTO `procurementstagetemplateslot` (`id`, `stageKey`, `slotKey`, `label`, `description`, `documentType`, `bidTypeScoped`, `sortOrder`, `isBuiltin`, `isActive`, `createdAt`, `updatedAt`) VALUES
('slot_notice', 'procurement_create', 'notice', 'Notice', 'Published procurement notice document', 'NOTICE', true, 0, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('slot_loi_pass', 'LETTERS_SENT', 'loi_pass', 'LOI (technical pass)', 'Letter of intent for bidders who passed technical evaluation', 'LOI_PASS', true, 0, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('slot_loi_fail', 'LETTERS_SENT', 'loi_fail', 'Rejection letter', 'Rejection letter for bidders who failed technical evaluation', 'LOI_FAIL', true, 1, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('slot_loi_winner', 'committee_decision', 'loi_winner', 'Winner LOI', 'Letter of intent for the winning bidder', 'LOI_WINNER', false, 0, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('slot_loa', 'LOI_ISSUED', 'loa', 'Letter of acceptance (LOA)', 'LOA document after LOI is issued', 'LOA', false, 0, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('slot_contract', 'LOA_ISSUED', 'contract', 'Contract agreement', 'Contract document after LOA is issued', 'CONTRACT', false, 0, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
