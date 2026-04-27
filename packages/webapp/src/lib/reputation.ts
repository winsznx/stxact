export function calculateSuccessRate(deliveries: number, disputes: number): number {
  if (deliveries === 0) return 0;
  const successful = Math.max(deliveries - disputes, 0);
  return successful / deliveries;
}

export function formatSuccessRatePercent(rate: number): string {
  const clamped = Math.max(0, Math.min(1, rate));
  return `${(clamped * 100).toFixed(1)}%`;
}

export function bandReputationScore(score: number): 'low' | 'medium' | 'high' {
  if (score < 50) return 'low';
  if (score < 80) return 'medium';
  return 'high';
}
