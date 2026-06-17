-- AlterTable bidtype already has defaultPriceBidDays from prior migration

-- Bidder financials (winner)
ALTER TABLE `bidder` ADD COLUMN `bidAmountWithVat` DECIMAL(18, 2) NULL;
ALTER TABLE `bidder` ADD COLUMN `bidAmountWithoutVat` DECIMAL(18, 2) NULL;

-- Procurement post-price-bid fields
ALTER TABLE `procurement` ADD COLUMN `warrantyDays` INT NULL;
ALTER TABLE `procurement` ADD COLUMN `pgAmount` DECIMAL(18, 2) NULL;
ALTER TABLE `procurement` ADD COLUMN `pgValidityDate` DATE NULL;
ALTER TABLE `procurement` ADD COLUMN `evaluationCommitteeSentDate` DATE NULL;
ALTER TABLE `procurement` ADD COLUMN `contractAgreementDate` DATE NULL;
ALTER TABLE `procurement` ADD COLUMN `poIssueDate` DATE NULL;
ALTER TABLE `procurement` ADD COLUMN `loaDocumentDate` DATE NULL;
ALTER TABLE `procurement` ADD COLUMN `pdiEndDate` DATE NULL;
ALTER TABLE `procurement` ADD COLUMN `workCountdownTotalDays` INT NULL;

-- Document template type: CONTRACT
ALTER TABLE `documenttemplate` MODIFY COLUMN `type` ENUM('NOTICE', 'LOI_PASS', 'LOI_FAIL', 'LOI_WINNER', 'LOA', 'CONTRACT') NOT NULL;

-- Move any scheduled price bids to open-ready (letters sent keeps date)
UPDATE `procurement` SET `status` = 'LETTERS_SENT' WHERE `status` = 'PRICE_BID_SCHEDULED';
