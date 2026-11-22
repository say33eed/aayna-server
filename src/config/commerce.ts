/** AAYNA business defaults. Stripe Checkout must use this currency consistently. */
export const AAYNA_CURRENCY = "bdt" as const;
export const AAYNA_TIME_ZONE = "Asia/Dhaka" as const;
/** Stripe amounts are expressed in the currency's smallest unit. */
export function toStripeMinorUnits(taka: number): number {
  if (!Number.isFinite(taka) || taka <= 0) throw new Error("Invalid BDT amount");
  const minor = Math.round(taka * 100);
  if (!Number.isSafeInteger(minor) || Math.abs(minor / 100 - taka) > 0.000001) {
    throw new Error("Invalid BDT precision");
  }
  return minor;
}
