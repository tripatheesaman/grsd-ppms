export type TechnicalLetterDocumentType = "loi-pass" | "loi-fail";

export type TechnicalLetterGenerationJob = {
  documentType: TechnicalLetterDocumentType;
  bidderId: string;
};

export type TechnicalBidder = {
  id: string;
  passedTech: boolean | null | undefined;
};

/** One LOI per technical pass, one rejection per fail — every bidder with a result gets a letter. */
export function planTechnicalLetterGenerations(
  bidders: TechnicalBidder[],
): TechnicalLetterGenerationJob[] {
  const jobs: TechnicalLetterGenerationJob[] = [];

  for (const bidder of bidders) {
    if (bidder.passedTech === true) {
      jobs.push({ documentType: "loi-pass", bidderId: bidder.id });
    } else if (bidder.passedTech === false) {
      jobs.push({ documentType: "loi-fail", bidderId: bidder.id });
    }
  }

  return jobs;
}

export function countTechnicalLetterGenerations(bidders: TechnicalBidder[]): {
  passed: number;
  failed: number;
  total: number;
} {
  const passed = bidders.filter((b) => b.passedTech === true).length;
  const failed = bidders.filter((b) => b.passedTech === false).length;
  return { passed, failed, total: passed + failed };
}
