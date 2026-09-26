import "server-only";
import {
  addMonths,
  buildClientLines,
  calculateLineProfitability,
  utcDate,
  type ClientProfitability,
  type ClientSources,
  type FinancialLine,
  type LabourEntry,
  type MarginThresholds,
} from "@/lib/profitability";
import { todayInTimeZone } from "@/lib/time";
import type { OrgContext } from "@/server/auth/context";
import { getOrganization } from "@/server/repositories/organizations";

export const TIMELINE_MONTHS = 12;

export interface FinancialSettings {
  currency: string;
  today: Date;
  labourWindowMonths: number;
  thresholds: MarginThresholds;
  defaultHourlyCost: string;
  defaultBillingInterval: string;
  /** First day of the oldest month shown in 12-month timelines. */
  timelineStart: Date;
  /** Earliest time-entry date any calculation needs (labour window or timeline). */
  timeEntriesSince: Date;
}

export async function getFinancialSettings(ctx: OrgContext): Promise<FinancialSettings> {
  const org = await getOrganization(ctx);
  const today = todayInTimeZone(org.timezone);
  const timelineStart = addMonths(utcDate(today.getUTCFullYear(), today.getUTCMonth(), 1), -(TIMELINE_MONTHS - 1));
  const labourStart = addMonths(today, -org.labourWindowMonths);
  return {
    currency: org.currency,
    today,
    labourWindowMonths: org.labourWindowMonths,
    thresholds: { low: org.lowMarginThreshold, negative: org.negativeMarginThreshold },
    defaultHourlyCost: org.defaultHourlyCost.toFixed(2),
    defaultBillingInterval: org.defaultBillingInterval,
    timelineStart,
    timeEntriesSince: timelineStart < labourStart ? timelineStart : labourStart,
  };
}

export interface ClientCalculation {
  lines: FinancialLine[];
  labour: LabourEntry[];
  profitability: ClientProfitability;
}

/** The one place DB rows are turned into engine input and a client's profitability. */
export function calculateForClient(
  client: ClientSources & { startDate: Date | null },
  settings: FinancialSettings,
): ClientCalculation {
  const { lines, labour } = buildClientLines(client);
  const profitability = calculateLineProfitability(lines, labour, {
    asOf: settings.today,
    windowMonths: settings.labourWindowMonths,
    activeSince: client.startDate,
    thresholds: settings.thresholds,
  });
  return { lines, labour, profitability };
}
