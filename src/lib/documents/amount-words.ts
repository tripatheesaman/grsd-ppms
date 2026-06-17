const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${tens[t]}${o ? ` ${ones[o]}` : ""}`.trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hundred = h ? `${ones[h]} Hundred` : "";
  const restWords = rest ? twoDigits(rest) : "";
  return [hundred, restWords].filter(Boolean).join(" ");
}

function section(value: number, label: string): string {
  if (!value) return "";
  return `${threeDigits(value)} ${label}`.trim();
}

export function amountToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  const whole = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - whole) * 100);

  const crore = Math.floor(whole / 10000000);
  const lakh = Math.floor((whole % 10000000) / 100000);
  const thousand = Math.floor((whole % 100000) / 1000);
  const hundredPart = whole % 1000;

  const parts = [
    section(crore, "Crore"),
    section(lakh, "Lakh"),
    section(thousand, "Thousand"),
    section(hundredPart, ""),
  ].filter(Boolean);

  let result = parts.join(" ");
  result = result ? `${result} Rupees` : "Zero Rupees";
  if (paise) result += ` and ${twoDigits(paise)} Paisa`;
  return `${result} Only`;
}
