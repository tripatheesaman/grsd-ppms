CREATE TABLE `bidderbidamountline` (
    `id` VARCHAR(191) NOT NULL,
    `bidderId` VARCHAR(191) NOT NULL,
    `amountKind` VARCHAR(191) NOT NULL,
    `currencyId` VARCHAR(191) NULL,
    `currencyCode` VARCHAR(191) NOT NULL,
    `currencyName` VARCHAR(191) NULL,
    `amount` DECIMAL(18, 4) NOT NULL,
    `forexRate` DECIMAL(18, 6) NULL,
    `nprAmount` DECIMAL(18, 2) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bidderbidamountline_bidderId_idx`(`bidderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `bidderbidamountline` ADD CONSTRAINT `bidderbidamountline_bidderId_fkey` FOREIGN KEY (`bidderId`) REFERENCES `bidder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
