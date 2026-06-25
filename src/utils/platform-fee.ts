export interface PlatformFeeBreakdown {
  feePerPlayer: number;
  percentage: number;
  ruleLabel: string;
}

export function getPlatformFeeBreakdown(
  entryFee: number,
  platformFeePercentage?: number | string | null,
): PlatformFeeBreakdown {
  const normalizedEntryFee = Number(entryFee || 0);
  const normalizedPercentage = Number(platformFeePercentage || 5);

  if (normalizedEntryFee >= 100000) {
    return {
      feePerPlayer: Math.round(normalizedEntryFee * (normalizedPercentage / 100)),
      percentage: normalizedPercentage,
      ruleLabel: `${normalizedPercentage}% lệ phí / người`,
    };
  }

  return {
    feePerPlayer: 5000,
    percentage: normalizedPercentage,
    ruleLabel: 'Cố định 5.000đ / người',
  };
}
