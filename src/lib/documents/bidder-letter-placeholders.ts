export type LetterBidder = {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
};

function formatDefaultCcLine(line: string): string {
  return line.trim();
}

function formatBidderCcLine(bidder: LetterBidder): string {
  const name = bidder.name.trim();
  const address = bidder.address.trim();
  const label = address ? `${name}, ${address}` : name;
  return `M/S ${label}`;
}

/** Default CC recipients first, then other bidders (excludes letter addressee). */
export function buildCcLineList(
  others: LetterBidder[],
  defaultCcLines: string[] = [],
): string[] {
  const lines: string[] = [];

  for (const raw of defaultCcLines) {
    const formatted = formatDefaultCcLine(raw);
    if (formatted) lines.push(formatted);
  }

  for (const bidder of others) {
    lines.push(formatBidderCcLine(bidder));
  }

  return lines;
}

/** Lines only (no CC: header) — defaults first, then other bidders. */
export function buildCcParticipantLines(
  others: LetterBidder[],
  defaultCcLines: string[] = [],
): string {
  return buildCcLineList(others, defaultCcLines).join("\n");
}

/** Only bidder CC lines (no defaults, no CC: header). */
export function buildBidderOnlyCcLines(others: LetterBidder[]): string {
  return others.map((bidder) => formatBidderCcLine(bidder)).join("\n");
}

/** Only bidder CC block (with CC: header, no defaults). */
export function buildBidderOnlyCcBlock(others: LetterBidder[]): string {
  const lines = buildBidderOnlyCcLines(others);
  if (!lines) return "";
  return `CC:\n${lines}`;
}

/**
 * Full CC section for {{cc_block}}: CC header, then default recipients from settings,
 * then all other bidders. Use this single placeholder at the end of the letter.
 */
export function buildCcBlock(
  others: LetterBidder[],
  defaultCcLines: string[] = [],
): string {
  const lines = buildCcLineList(others, defaultCcLines);
  if (lines.length === 0) return "";
  return `CC:\n${lines.join("\n")}`;
}

export function buildBidderLetterPlaceholders(
  bidders: LetterBidder[],
  addresseeId: string,
  options?: { withCc?: boolean; defaultCcLines?: string[] },
): Record<string, string> {
  const addressee = bidders.find((b) => b.id === addresseeId);
  if (!addressee) return {};

  const others = bidders.filter((b) => b.id !== addresseeId);
  const withCc = options?.withCc ?? false;
  const defaultCcLines = options?.defaultCcLines ?? [];

  const ccLines = withCc ? buildCcParticipantLines(others, defaultCcLines) : "";
  const ccBlock = withCc ? buildCcBlock(others, defaultCcLines) : "";
  const bidderOnlyCcLines = withCc ? buildBidderOnlyCcLines(others) : "";
  const bidderOnlyCcBlock = withCc ? buildBidderOnlyCcBlock(others) : "";

  return {
    bidder_name: addressee.name,
    bidder_address: addressee.address,
    bidder_phone: addressee.phone?.trim() ?? "",
    suppliername: addressee.name,
    supplier_name: addressee.name,
    supplier_address: addressee.address,
    cc_block: ccBlock,
    cc_lines: ccLines,
    cc_participants: ccBlock,
    cc_bidders_only: bidderOnlyCcBlock,
    cc_bidders_only_lines: bidderOnlyCcLines,
  };
}
