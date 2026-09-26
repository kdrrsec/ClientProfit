import Decimal from "decimal.js";

/**
 * Isolated Decimal constructor for all financial math. High precision so that
 * intermediate results (e.g. yearly / 12) never lose cents; rounding happens
 * only at presentation boundaries via roundMoney/roundPercent.
 */
export const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Money = Decimal;

/** Anything a Prisma Decimal, string or Decimal can be read from. Numbers are rejected on purpose. */
export type MoneyInput = string | Decimal | { toString(): string };

export const ZERO: Money = new Money(0);

export function toMoney(value: MoneyInput): Money {
  if (typeof value === "number") {
    throw new TypeError("Pass monetary amounts as string or Decimal, not number");
  }
  return new Money(value.toString());
}

export function sum(values: Iterable<Money>): Money {
  let total = ZERO;
  for (const v of values) total = total.plus(v);
  return total;
}

/** Round to cents (half-up). */
export function roundMoney(value: Money): Money {
  return value.toDecimalPlaces(2, Money.ROUND_HALF_UP);
}

/** Round a percentage to one decimal (half-up). */
export function roundPercent(value: Money): Money {
  return value.toDecimalPlaces(1, Money.ROUND_HALF_UP);
}
