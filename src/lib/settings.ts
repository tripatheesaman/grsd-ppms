import { prisma } from "@/lib/prisma";

export type BidFeeTier = {
  maxInclusive: number | null;
  fee: number;
};

export type ValidityTier = {
  maxInclusive: number | null;
  days: number;
};

export type PartyPerson = {
  name: string;
  designation: string;
};

export type AppSettings = {
  vatPercent: number;
  bsfMinPercent: number;
  bsfMaxPercent: number;
  bsfDefaultPercent: number;
  prebidOffsetDays: number;
  completionBufferDays: number;
  /** Working days after LOI before LOA is issued. */
  loaDelayDays: number;
  pgDiscountThresholdPercent: number;
  pgLowDiscountRatePercent: number;
  pgFrontLoadingCostFactor: number;
  pgFrontLoadingRate: number;
  /** Extra days added to PG validity (work days + warranty + this). */
  pgValidityExtensionDays: number;
  defaultPrebidTime: string;
  defaultBidSubmissionTime: string;
  defaultBidOpenTime: string;
  weeklyDefaultOffDays: number[];
  bidFeeTiers: BidFeeTier[];
  validityTiers: ValidityTier[];
  /** Fixed CC recipients prepended before bidder CC lines in LOI / rejection letters */
  letterDefaultCcLines: string[];
  /** Department witnesses for contract documents. */
  departmentWitnesses: PartyPerson[];
  /** Department signing authorities for contract documents. */
  departmentSigningAuthorities: PartyPerson[];
  /** @deprecated use departmentWitnesses */
  departmentWitnessName: string;
  /** @deprecated use departmentWitnesses */
  departmentWitnessDesignation: string;
  /** @deprecated use departmentSigningAuthorities */
  departmentSigningAuthorityName: string;
  /** @deprecated use departmentSigningAuthorities */
  departmentSigningAuthorityDesignation: string;
};

const defaults: AppSettings = {
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
  bidFeeTiers: [
    { maxInclusive: 2000000, fee: 1000 },
    { maxInclusive: 20000000, fee: 3000 },
    { maxInclusive: 100000000, fee: 5000 },
    { maxInclusive: 250000000, fee: 10000 },
    { maxInclusive: null, fee: 20000 },
  ],
  validityTiers: [
    { maxInclusive: 100000000, days: 90 },
    { maxInclusive: null, days: 120 },
  ],
  letterDefaultCcLines: [],
  departmentWitnesses: [],
  departmentSigningAuthorities: [],
  departmentWitnessName: "",
  departmentWitnessDesignation: "",
  departmentSigningAuthorityName: "",
  departmentSigningAuthorityDesignation: "",
};

export async function loadSettings(): Promise<AppSettings> {
  const rows = await prisma.systemSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const departmentWitnesses = normalizePartyPeople(
    map.get("departmentWitnesses"),
    String(map.get("departmentWitnessName") ?? ""),
    String(map.get("departmentWitnessDesignation") ?? ""),
  );
  const departmentSigningAuthorities = normalizePartyPeople(
    map.get("departmentSigningAuthorities"),
    String(map.get("departmentSigningAuthorityName") ?? ""),
    String(map.get("departmentSigningAuthorityDesignation") ?? ""),
  );

  return normalizeAppSettings({
    vatPercent: Number(map.get("vatPercent") ?? defaults.vatPercent),
    bsfMinPercent: Number(map.get("bsfMinPercent") ?? defaults.bsfMinPercent),
    bsfMaxPercent: Number(map.get("bsfMaxPercent") ?? defaults.bsfMaxPercent),
    bsfDefaultPercent: Number(map.get("bsfDefaultPercent") ?? defaults.bsfDefaultPercent),
    prebidOffsetDays: Number(map.get("prebidOffsetDays") ?? defaults.prebidOffsetDays),
    completionBufferDays: Number(map.get("completionBufferDays") ?? defaults.completionBufferDays),
    loaDelayDays: Number(map.get("loaDelayDays") ?? defaults.loaDelayDays),
    pgDiscountThresholdPercent: Number(
      map.get("pgDiscountThresholdPercent") ?? defaults.pgDiscountThresholdPercent,
    ),
    pgLowDiscountRatePercent: Number(
      map.get("pgLowDiscountRatePercent") ?? defaults.pgLowDiscountRatePercent,
    ),
    pgFrontLoadingCostFactor: Number(
      map.get("pgFrontLoadingCostFactor") ?? defaults.pgFrontLoadingCostFactor,
    ),
    pgFrontLoadingRate: Number(map.get("pgFrontLoadingRate") ?? defaults.pgFrontLoadingRate),
    pgValidityExtensionDays: Number(
      map.get("pgValidityExtensionDays") ?? defaults.pgValidityExtensionDays,
    ),
    defaultPrebidTime: String(map.get("defaultPrebidTime") ?? defaults.defaultPrebidTime),
    defaultBidSubmissionTime: String(
      map.get("defaultBidSubmissionTime") ?? defaults.defaultBidSubmissionTime,
    ),
    defaultBidOpenTime: String(map.get("defaultBidOpenTime") ?? defaults.defaultBidOpenTime),
    weeklyDefaultOffDays:
      (map.get("weeklyDefaultOffDays") as number[]) ?? defaults.weeklyDefaultOffDays,
    bidFeeTiers: (map.get("bidFeeTiers") as BidFeeTier[]) ?? defaults.bidFeeTiers,
    validityTiers: (map.get("validityTiers") as ValidityTier[]) ?? defaults.validityTiers,
    letterDefaultCcLines: normalizeStringList(
      map.get("letterDefaultCcLines") ?? defaults.letterDefaultCcLines,
    ),
    departmentWitnesses,
    departmentSigningAuthorities,
    departmentWitnessName:
      departmentWitnesses[0]?.name ??
      String(map.get("departmentWitnessName") ?? defaults.departmentWitnessName),
    departmentWitnessDesignation:
      departmentWitnesses[0]?.designation ??
      String(map.get("departmentWitnessDesignation") ?? defaults.departmentWitnessDesignation),
    departmentSigningAuthorityName:
      departmentSigningAuthorities[0]?.name ??
      String(map.get("departmentSigningAuthorityName") ?? defaults.departmentSigningAuthorityName),
    departmentSigningAuthorityDesignation:
      departmentSigningAuthorities[0]?.designation ??
      String(
        map.get("departmentSigningAuthorityDesignation") ??
          defaults.departmentSigningAuthorityDesignation,
      ),
  });
}

function toSettingNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Merge partial settings with defaults (handles older procurement snapshots). */
export function normalizeAppSettings(partial: Partial<AppSettings>): AppSettings {
  const departmentWitnesses = normalizePartyPeople(
    partial.departmentWitnesses,
    partial.departmentWitnessName ?? defaults.departmentWitnessName,
    partial.departmentWitnessDesignation ?? defaults.departmentWitnessDesignation,
  );
  const departmentSigningAuthorities = normalizePartyPeople(
    partial.departmentSigningAuthorities,
    partial.departmentSigningAuthorityName ?? defaults.departmentSigningAuthorityName,
    partial.departmentSigningAuthorityDesignation ?? defaults.departmentSigningAuthorityDesignation,
  );
  return {
    vatPercent: toSettingNumber(partial.vatPercent, defaults.vatPercent),
    bsfMinPercent: toSettingNumber(partial.bsfMinPercent, defaults.bsfMinPercent),
    bsfMaxPercent: toSettingNumber(partial.bsfMaxPercent, defaults.bsfMaxPercent),
    bsfDefaultPercent: toSettingNumber(partial.bsfDefaultPercent, defaults.bsfDefaultPercent),
    prebidOffsetDays: toSettingNumber(partial.prebidOffsetDays, defaults.prebidOffsetDays),
    completionBufferDays: toSettingNumber(
      partial.completionBufferDays,
      defaults.completionBufferDays,
    ),
    loaDelayDays: toSettingNumber(partial.loaDelayDays, defaults.loaDelayDays),
    pgDiscountThresholdPercent: toSettingNumber(
      partial.pgDiscountThresholdPercent,
      defaults.pgDiscountThresholdPercent,
    ),
    pgLowDiscountRatePercent: toSettingNumber(
      partial.pgLowDiscountRatePercent,
      defaults.pgLowDiscountRatePercent,
    ),
    pgFrontLoadingCostFactor: toSettingNumber(
      partial.pgFrontLoadingCostFactor,
      defaults.pgFrontLoadingCostFactor,
    ),
    pgFrontLoadingRate: toSettingNumber(
      partial.pgFrontLoadingRate,
      defaults.pgFrontLoadingRate,
    ),
    pgValidityExtensionDays: toSettingNumber(
      partial.pgValidityExtensionDays,
      defaults.pgValidityExtensionDays,
    ),
    defaultPrebidTime: String(partial.defaultPrebidTime ?? defaults.defaultPrebidTime),
    defaultBidSubmissionTime: String(
      partial.defaultBidSubmissionTime ?? defaults.defaultBidSubmissionTime,
    ),
    defaultBidOpenTime: String(partial.defaultBidOpenTime ?? defaults.defaultBidOpenTime),
    weeklyDefaultOffDays: Array.isArray(partial.weeklyDefaultOffDays)
      ? partial.weeklyDefaultOffDays
      : defaults.weeklyDefaultOffDays,
    bidFeeTiers: partial.bidFeeTiers ?? defaults.bidFeeTiers,
    validityTiers: partial.validityTiers ?? defaults.validityTiers,
    letterDefaultCcLines: normalizeStringList(
      partial.letterDefaultCcLines ?? defaults.letterDefaultCcLines,
    ),
    departmentWitnesses,
    departmentSigningAuthorities,
    departmentWitnessName: departmentWitnesses[0]?.name ?? defaults.departmentWitnessName,
    departmentWitnessDesignation:
      departmentWitnesses[0]?.designation ?? defaults.departmentWitnessDesignation,
    departmentSigningAuthorityName:
      departmentSigningAuthorities[0]?.name ?? defaults.departmentSigningAuthorityName,
    departmentSigningAuthorityDesignation:
      departmentSigningAuthorities[0]?.designation ?? defaults.departmentSigningAuthorityDesignation,
  };
}

function normalizePartyPeople(
  value: unknown,
  fallbackName = "",
  fallbackDesignation = "",
): PartyPerson[] {
  const rows = Array.isArray(value)
    ? value
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const row = entry as { name?: unknown; designation?: unknown };
          return {
            name: String(row.name ?? "").trim(),
            designation: String(row.designation ?? "").trim(),
          };
        })
        .filter((row): row is PartyPerson => Boolean(row && row.name && row.designation))
    : [];
  if (rows.length > 0) return rows;
  if (fallbackName.trim() && fallbackDesignation.trim()) {
    return [{ name: fallbackName.trim(), designation: fallbackDesignation.trim() }];
  }
  return [];
}

function normalizeStringList(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }
  }
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function normalizeSettingValue(key: string, value: unknown): unknown {
  if (key === "letterDefaultCcLines") {
    return normalizeStringList(value);
  }
  return value;
}

export async function saveSetting(key: string, value: unknown) {
  const normalized = normalizeSettingValue(key, value);
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: normalized as object },
    create: { key, value: normalized as object },
  });
}
