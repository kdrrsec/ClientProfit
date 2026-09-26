import { Money, type Money as MoneyT, type MoneyInput, toMoney } from "./money";

export type MarginStatus = "POSITIVE" | "LOW" | "NEGATIVE" | "NO_REVENUE";

export interface MarginThresholds {
  /** Percent. Margins below this are LOW. */
  low: MoneyInput;
  /** Percent. Margins below this are NEGATIVE. */
  negative: MoneyInput;
}

export const DEFAULT_THRESHOLDS: MarginThresholds = { low: new Money(30), negative: new Money(0) };

/** Neutral, number-based classification. No subjective "good/bad" scoring. */
export function getMarginStatus(margin: MoneyT | null, thresholds: MarginThresholds = DEFAULT_THRESHOLDS): MarginStatus {
  if (margin === null) return "NO_REVENUE";
  if (margin.lessThan(toMoney(thresholds.negative))) return "NEGATIVE";
  if (margin.lessThan(toMoney(thresholds.low))) return "LOW";
  return "POSITIVE";
}
