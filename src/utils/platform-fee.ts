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
  const rawPercentage = platformFeePercentage !== undefined && platformFeePercentage !== null
    ? Number(platformFeePercentage)
    : 0;
  const normalizedPercentage = isNaN(rawPercentage) ? 0 : rawPercentage;

  if (normalizedPercentage === 0) {
    return {
      feePerPlayer: 0,
      percentage: 0,
      ruleLabel: 'Miễn phí lệ phí dịch vụ (0đ / người)',
    };
  }

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

