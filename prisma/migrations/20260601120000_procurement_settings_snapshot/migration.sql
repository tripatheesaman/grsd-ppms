ALTER TABLE `procurement` ADD COLUMN `settingsSnapshot` JSON NULL,
    ADD COLUMN `settingsSnapshotAt` DATETIME(3) NULL;
