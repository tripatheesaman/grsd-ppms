import { describe, expect, it } from "vitest";
import { buildPlaceholderMap } from "@/lib/documents/placeholders";
import type { AppSettings } from "@/lib/settings";

const settings: AppSettings = {
  vatPercent: 13,
  bsfMinPercent: 2,
  bsfMaxPercent: 3,
  bsfDefaultPercent: 2.5,
  prebidOffsetDays: 15,
  completionBufferDays: 30,
  loaDelayDays: 7,
  pgDiscountThresholdPercent: 15,
  pgLowDiscountRatePercent: 5,
  pgFrontLoadingCostFactor: 0.85,
  pgFrontLoadingRate: 0.5,
  pgValidityExtensionDays: 0,
  defaultPrebidTime: "12:00",
  defaultBidSubmissionTime: "16:00",
  defaultBidOpenTime: "14:00",
  weeklyDefaultOffDays: [0, 6],
  bidFeeTiers: [],
  validityTiers: [],
  letterDefaultCcLines: [],
  departmentWitnesses: [{ name: "Dept Witness", designation: "Section Officer" }],
  departmentSigningAuthorities: [{ name: "Dept Signer", designation: "Director" }],
  departmentWitnessName: "Dept Witness",
  departmentWitnessDesignation: "Section Officer",
  departmentSigningAuthorityName: "Dept Signer",
  departmentSigningAuthorityDesignation: "Director",
};

describe("buildPlaceholderMap", () => {
  it("includes reference numbers by type code and financial settings", () => {
    const map = buildPlaceholderMap(
      {
        title: "Test procurement",
        itemName: "Item A",
        dtssrNumber: "DT-1",
        status: "ACTIVE",
        statusLabel: "Active",
        costEstimate: 1000000,
        bidFee: 3000,
        bidSecurity: 25000,
        grandTotalWithVat: 1130000,
        bsfPercent: 2.5,
        totalQuantity: 10,
        bidValidityDays: 90,
        bidDays: 45,
        bidTypeDefaultDays: 45,
        noticeDate: new Date(Date.UTC(2025, 6, 15)),
        bidFeeSubmissionDate: null,
        bidOpenDate: new Date(Date.UTC(2025, 7, 29)),
        prebidDate: new Date(Date.UTC(2025, 7, 14)),
        bidValidityDate: null,
        bidSecurityValidityDate: null,
        scheduledInitiationDate: null,
        scheduledCompletionDate: null,
        priceBidOpenDate: null,
        technicalEvalSentDate: null,
        loiIssuedDate: null,
        loaIssuedDate: null,
        loaDocumentDate: null,
        contractSignedDate: null,
        contractAgreementDate: null,
        cinNumber: null,
        supplierWitnessName: null,
        supplierWitnessDesignation: null,
        supplierSigningAuthorityName: null,
        supplierSigningAuthorityDesignation: null,
        evaluationCommitteeSentDate: null,
        pgValidityDate: null,
        pgAmount: null,
        warrantyDays: null,
        pdiDate: null,
        winnerBidAmountWithVat: null,
        winnerBidAmountWithoutVat: null,
        winnerBidCurrencyCode: null,
        winnerBidCurrencyName: null,
        winnerBidCurrencySymbol: null,
        paymentConditionCode: null,
        paymentConditionName: null,
        deliveryReceivedDate: null,
        prebidAcknowledgedAt: null,
        bidOpenAcknowledgedAt: null,
        periodBegunAt: null,
        prebidTime: "12:00",
        bidSubmissionTime: "16:00",
        bidOpenTime: "14:00",
        references: [
          { type: "IFB", code: "IFB", number: "IFB-2025-001" },
          { type: "RFP", code: "RFP", number: "RFP-99" },
        ],
        workDays: [{ categoryName: "Ex-work", days: 30 }],
        bidTypeName: "Goods",
        mediaName: "National",
        sbdName: "SBD 1",
        contractTypeName: "Lump sum",
        unitName: "Set",
        unitSymbol: "set",
      },
      settings,
    );

    expect(map.ifb_number).toBe("IFB-2025-001");
    expect(map.rfp_number).toBe("RFP-99");
    expect(map.vat_percent).toBe("13");
    expect(map.bsf_percent).toBe("2.5");
    expect(map.bid_days).toBe("45");
    expect(map.bid_type).toBe("Goods");
    expect(map.sbd).toBe("SBD 1");
    expect(map.notice_date).toBe("2025-07-15");
    expect(map.notice_date_bs).toBe("2082-03-31");
    expect(map.notice_date_dual).toContain("2025-07-15");
    expect(map.today_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(map.today_date_bs).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(map.today_date_dual).toContain(map.today_date);
    expect(map.work_day_ex_work_days).toBe("30");
  });
});
