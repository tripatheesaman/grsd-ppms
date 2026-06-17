-- Expand reminder rules for configurable days-before and frequency
ALTER TABLE `reminderrule`
  ADD COLUMN `remindDaysBefore` JSON NOT NULL DEFAULT (JSON_ARRAY(7, 3, 1)),
  ADD COLUMN `repeatEveryDays` INT NOT NULL DEFAULT 0,
  ADD COLUMN `notifyInApp` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `dateField` VARCHAR(191) NULL,
  ADD COLUMN `milestoneType` VARCHAR(191) NOT NULL DEFAULT 'FIXED_DATE',
  ADD COLUMN `anchorDateField` VARCHAR(191) NULL,
  ADD COLUMN `offsetWorkingDays` INT NULL,
  ADD COLUMN `sortOrder` INT NOT NULL DEFAULT 0;

-- Backfill dateField from milestoneKey for existing rows
UPDATE `reminderrule` SET `dateField` = `milestoneKey` WHERE `dateField` IS NULL;
