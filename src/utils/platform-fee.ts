export type PlatformFeeRuleType = 'FREE' | 'PERCENTAGE' | 'FIXED';

export interface PlatformFeeRuleInput {
  thresholdAmount?: number | string | null;
  fixedAmount?: number | string | null;
}

export interface PlatformFeeBreakdown {
  feePerPlayer: number;
  percentage: number;
  ruleType: PlatformFeeRuleType;
  thresholdAmount: number;
  fixedAmount: number;
}

const DEFAULT_THRESHOLD_AMOUNT = 100000;
const DEFAULT_FIXED_AMOUNT = 5000;

function normalizeNonNegativeInteger(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getPlatformFeeBreakdown(
  entryFee: number,
  platformFeePercentage?: number | string | null,
  ruleInput?: PlatformFeeRuleInput,
): PlatformFeeBreakdown {
  const normalizedEntryFee = Number(entryFee || 0);
  const rawPercentage = platformFeePercentage !== undefined && platformFeePercentage !== null
    ? Number(platformFeePercentage)
    : 0;
  const normalizedPercentage = Number.isFinite(rawPercentage) && rawPercentage > 0
    ? rawPercentage
    : 0;
  const thresholdAmount = normalizeNonNegativeInteger(
    ruleInput?.thresholdAmount,
    DEFAULT_THRESHOLD_AMOUNT,
  );
  const fixedAmount = normalizeNonNegativeInteger(
    ruleInput?.fixedAmount,
    DEFAULT_FIXED_AMOUNT,
  );

  if (normalizedPercentage === 0 || normalizedEntryFee === 0) {
    return {
      feePerPlayer: 0,
      percentage: normalizedPercentage,
      ruleType: 'FREE',
      thresholdAmount,
      fixedAmount,
    };
  }

  if (normalizedEntryFee >= thresholdAmount) {
    return {
      feePerPlayer: Math.round(normalizedEntryFee * (normalizedPercentage / 100)),
      percentage: normalizedPercentage,
      ruleType: 'PERCENTAGE',
      thresholdAmount,
      fixedAmount,
    };
  }

  return {
    feePerPlayer: fixedAmount,
    percentage: normalizedPercentage,
    ruleType: 'FIXED',
    thresholdAmount,
    fixedAmount,
  };
}
