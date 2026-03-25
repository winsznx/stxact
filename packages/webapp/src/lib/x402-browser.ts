import type { Receipt } from '@/lib/api';

const LATEST_RECEIPT_STORAGE_KEY = 'stxact:last-browser-flow-receipt';
const LATEST_ARTIFACT_STORAGE_KEY = 'stxact:last-browser-flow-artifact';

export interface X402PaymentOption {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
}

export interface X402PaymentRequiredResponse {
  x402Version: number;
  resource?: {
    url?: string;
    description?: string;
    mimeType?: string;
  };
  accepts: X402PaymentOption[];
}

export interface X402BrowserRetryPayload {
  x402Version: 2;
  resource?: X402PaymentRequiredResponse['resource'];
  accepted: X402PaymentOption;
  payload: {
    transaction: string;
  };
  payer?: string;
}

export interface X402PaymentResponse {
  success: boolean;
  payer?: string;
  transaction: string;
  network: string;
  errorReason?: string;
}

function decodeBase64Json<T>(value: string): T | null {
  try {
    return JSON.parse(atob(value)) as T;
  } catch {
    return null;
  }
}

function encodeBase64Json(value: unknown): string {
  return btoa(JSON.stringify(value));
}

export function normalizePaymentRequiredResponse(raw: unknown): X402PaymentRequiredResponse | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;

  const accepts = Array.isArray(record.accepts)
    ? record.accepts
    : record.paymentRequirements
      ? [record.paymentRequirements]
      : [];

  const normalizedAccepts = accepts.filter((candidate): candidate is X402PaymentOption => {
    return (
      !!candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as X402PaymentOption).network === 'string' &&
      typeof (candidate as X402PaymentOption).asset === 'string' &&
      typeof (candidate as X402PaymentOption).amount === 'string' &&
      typeof (candidate as X402PaymentOption).payTo === 'string'
    );
  });

  if (!normalizedAccepts.length) {
    return null;
  }

  return {
    x402Version: Number(record.x402Version || 2),
    resource:
      record.resource && typeof record.resource === 'object'
        ? (record.resource as X402PaymentRequiredResponse['resource'])
        : undefined,
    accepts: normalizedAccepts,
  };
}

export function decodePaymentRequiredHeader(headerValue: string | null): X402PaymentRequiredResponse | null {
  if (!headerValue) {
    return null;
  }

  const decoded = decodeBase64Json<Record<string, unknown>>(headerValue);
  if (!decoded) {
    return null;
  }

  return normalizePaymentRequiredResponse(decoded);
}

export function selectPaymentOption(
  paymentRequired: X402PaymentRequiredResponse,
  network: 'testnet' | 'mainnet'
): X402PaymentOption | null {
  const targetNetwork = network === 'mainnet' ? 'stacks:1' : 'stacks:2147483648';

  return (
    paymentRequired.accepts.find(
      (option) => option.network === targetNetwork && option.asset.toUpperCase() === 'STX'
    ) || null
  );
}

export function createBrowserPaymentSignature(payload: X402BrowserRetryPayload): string {
  return encodeBase64Json(payload);
}

export function decodePaymentResponseHeader(headerValue: string | null): X402PaymentResponse | null {
  if (!headerValue) {
    return null;
  }

  return decodeBase64Json<X402PaymentResponse>(headerValue);
}

export function decodeReceiptHeader(headerValue: string | null): Receipt | null {
  if (!headerValue) {
    return null;
  }

  return decodeBase64Json<Receipt>(headerValue);
}

export function formatMicroStx(amountMicroStx: string): string {
  const microStxUnit = BigInt(1_000_000);
  const microStx = BigInt(amountMicroStx);
  const whole = microStx / microStxUnit;
  const fraction = (microStx % microStxUnit).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole.toString()}.${fraction} STX` : `${whole.toString()} STX`;
}

/**
 * Executes logic associated with store latest browser flow.
 */
export function storeLatestBrowserFlow(receipt: Receipt, artifactText: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(LATEST_RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
  window.sessionStorage.setItem(LATEST_ARTIFACT_STORAGE_KEY, artifactText);
}

/**
 * Executes logic associated with read latest browser flow.
 */
export function readLatestBrowserFlow() {
  if (typeof window === 'undefined') {
    return { receipt: null as Receipt | null, artifactText: null as string | null };
  }

  try {
    const receiptJson = window.sessionStorage.getItem(LATEST_RECEIPT_STORAGE_KEY);
    const artifactText = window.sessionStorage.getItem(LATEST_ARTIFACT_STORAGE_KEY);
    return {
      receipt: receiptJson ? (JSON.parse(receiptJson) as Receipt) : null,
      artifactText,
    };
  } catch {
    return { receipt: null as Receipt | null, artifactText: null as string | null };
  }
}
