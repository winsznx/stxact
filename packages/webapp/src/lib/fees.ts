const STX_DECIMALS = 6;
const SBTC_DECIMALS = 8;

export function microStxToStx(micro: bigint | number): number {
  const value = typeof micro === 'bigint' ? Number(micro) : micro;
  return value / 10 ** STX_DECIMALS;
}

export function stxToMicroStx(stx: number): bigint {
  return BigInt(Math.round(stx * 10 ** STX_DECIMALS));
}

export function satToSbtc(sats: bigint | number): number {
  const value = typeof sats === 'bigint' ? Number(sats) : sats;
  return value / 10 ** SBTC_DECIMALS;
}

export function sbtcToSat(sbtc: number): bigint {
  return BigInt(Math.round(sbtc * 10 ** SBTC_DECIMALS));
}

export function formatPriceSbtc(sats: bigint | number, decimals = 8): string {
  const value = satToSbtc(sats).toFixed(decimals);
  return `${value} sBTC`;
}
