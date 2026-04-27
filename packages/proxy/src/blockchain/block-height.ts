import { getStacksApiUrl } from '../config/network';

interface ChainTipResponse {
  burn_block_height: number;
  stacks_tip_height: number;
}

export async function getCurrentChainTip(): Promise<number> {
  const url = `${getStacksApiUrl()}/extended/v1/block?limit=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch chain tip: ${res.status}`);
  }
  const data = (await res.json()) as { results: Array<{ height: number }> };
  if (!Array.isArray(data.results) || data.results.length === 0) {
    throw new Error('Chain tip response empty');
  }
  return data.results[0].height;
}

export async function getBurnChainTip(): Promise<number> {
  const url = `${getStacksApiUrl()}/extended/v2/burn-blocks?limit=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch burn chain tip: ${res.status}`);
  }
  const data = (await res.json()) as { results: Array<{ burn_block_height: number }> };
  if (!Array.isArray(data.results) || data.results.length === 0) {
    throw new Error('Burn chain tip response empty');
  }
  return data.results[0].burn_block_height;
}
