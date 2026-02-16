import { createHash } from 'crypto';
import {
  addressFromPublicKeys,
  addressToString,
  AddressHashMode,
  AddressVersion,
  callReadOnlyFunction,
  createStacksPrivateKey,
  createStacksPublicKey,
  cvToJSON,
  principalCV,
  signMessageHashRsv,
  publicKeyFromSignatureRsv,
  ClarityType,
  StacksMessageType,
} from '@stacks/transactions';
import { StacksNetwork } from '@stacks/network';
import { Receipt, generateReceiptCanonicalMessage } from './receipt-canonical';
import { logger } from '../config/logger';

/**
 * Sign a receipt using Stacks ECDSA private key
 *
 * Algorithm:
 * 1. Generate canonical message from receipt fields
 * 2. Hash canonical message with SHA-256
 * 3. Sign hash using SECP256K1 (Stacks private key)
 * 4. Encode signature as base64
 *
 * PRD Reference: Section 8 - Signature Generation (lines 995-1022)
 */
export function signReceipt(
  receipt: Omit<Receipt, 'metadata' | 'signature'>,
  privateKey: string
): string {
  const canonicalMsg = generateReceiptCanonicalMessage(receipt);
  const msgHash = createHash('sha256').update(canonicalMsg).digest('hex');

  const privateKeyObj = createStacksPrivateKey(privateKey);
  const signature = signMessageHashRsv({
    messageHash: msgHash,
    privateKey: privateKeyObj,
  });

  return Buffer.from(signature.data).toString('base64');
}

/**
 * Verify a receipt signature
 *
 * Algorithm:
 * 1. Reconstruct canonical message with all 13 authoritative fields
 * 2. Hash canonical message with SHA-256
 * 3. Recover public key from signature
 * 4. Derive Stacks principal from public key
 * 5. Verify derived principal matches receipt.seller_principal
 * 6. (Optional) Query on-chain signing-keys map to verify key_version
 *
 * PRD Reference: Section 8 - Signature Verification (lines 1027-1100)
 */
export async function verifyReceipt(
  receipt: Receipt,
  network: StacksNetwork,
  verifyKeyVersion: boolean = false
): Promise<boolean> {
  try {
    const canonicalMsg = generateReceiptCanonicalMessage(receipt);
    const msgHash = createHash('sha256').update(canonicalMsg).digest('hex');
    const signatureBuffer = Buffer.from(receipt.signature || '', 'base64');

    // publicKeyFromSignatureRsv expects: (messageHash, messageSignature, pubKeyEncoding)
    const publicKeyHex = publicKeyFromSignatureRsv(
      msgHash,
      { type: StacksMessageType.MessageSignature, data: signatureBuffer.toString('hex') }
    );

    const publicKey = createStacksPublicKey(publicKeyHex);

    const derivedAddress = addressFromPublicKeys(
      AddressVersion.MainnetSingleSig,
      AddressHashMode.SerializeP2PKH,
      1,
      [publicKey]
    );

    const derivedPrincipal = addressToString(derivedAddress);

    if (derivedPrincipal !== receipt.seller_principal) {
      logger.warn('Receipt signature verification failed: principal mismatch', {
        expected: receipt.seller_principal,
        derived: derivedPrincipal,
        receipt_id: receipt.receipt_id,
      });
      return false;
    }

    if (verifyKeyVersion) {
      const contractAddress = process.env.REPUTATION_MAP_ADDRESS;
      if (!contractAddress) {
        logger.warn('REPUTATION_MAP_ADDRESS not set, skipping key version verification');
        return true;
      }

      const [address, contractName] = contractAddress.split('.');

      try {
        const keyVersionResult = await callReadOnlyFunction({
          contractAddress: address,
          contractName,
          functionName: 'get-signing-key-version',
          functionArgs: [principalCV(receipt.seller_principal)],
          network,
          senderAddress: receipt.seller_principal,
        });

        if (keyVersionResult.type === ClarityType.ResponseOk) {
          const onChainKeyData = cvToJSON(keyVersionResult.value);
          const onChainKeyVersion = onChainKeyData?.value?.['key-version']?.value;

          if (receipt.key_version > onChainKeyVersion) {
            logger.warn('Receipt claims future key version that does not exist', {
              receipt_key_version: receipt.key_version,
              on_chain_key_version: onChainKeyVersion,
              receipt_id: receipt.receipt_id,
            });
            return false;
          }
        }
      } catch (error) {
        logger.error('Failed to verify key version on-chain', {
          error: error instanceof Error ? error.message : 'Unknown error',
          receipt_id: receipt.receipt_id,
        });
      }
    }

    return true;
  } catch (error) {
    logger.error('Receipt signature verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      receipt_id: receipt.receipt_id,
    });
    return false;
  }
}

/**
 * Sign refund authorization message
 *
 * Canonical Refund Message (PRD Section 11, line 1586):
 * STXACT-REFUND:${dispute_id}:${receipt_id}:${refund_amount}:${buyer_principal}:${seller_principal}:${timestamp}
 *
 * Including seller_principal prevents signature replay across different services
 */
export interface RefundAuthorization {
  dispute_id: string;
  receipt_id: string;
  refund_amount: string;
  buyer_principal: string;
  seller_principal: string;
  timestamp: number;
  signature?: string;
}

export function signRefundAuthorization(
  refund: Omit<RefundAuthorization, 'signature'>,
  privateKey: string
): string {
  const canonicalMsg = [
    'STXACT-REFUND',
    refund.dispute_id,
    refund.receipt_id,
    refund.refund_amount,
    refund.buyer_principal,
    refund.seller_principal,
    refund.timestamp.toString(),
  ].join(':');

  const msgHash = createHash('sha256').update(canonicalMsg).digest('hex');

  const privateKeyObj = createStacksPrivateKey(privateKey);
  const signature = signMessageHashRsv({
    messageHash: msgHash,
    privateKey: privateKeyObj,
  });

  return Buffer.from(signature.data).toString('base64');
}

/**
 * Verify refund authorization signature
 *
 * Returns the recovered seller principal if signature is valid, null otherwise
 */
export function verifyRefundAuthorization(refund: RefundAuthorization): string | null {
  try {
    if (!refund.signature) {
      return null;
    }

    const canonicalMsg = [
      'STXACT-REFUND',
      refund.dispute_id,
      refund.receipt_id,
      refund.refund_amount,
      refund.buyer_principal,
      refund.seller_principal,
      refund.timestamp.toString(),
    ].join(':');

    const msgHash = createHash('sha256').update(canonicalMsg).digest('hex');
    const signatureBuffer = Buffer.from(refund.signature, 'base64');

    // publicKeyFromSignatureRsv expects: (messageHash, messageSignature, pubKeyEncoding)
    const publicKeyHex = publicKeyFromSignatureRsv(
      msgHash,
      { type: StacksMessageType.MessageSignature, data: signatureBuffer.toString('hex') }
    );

    const publicKey = createStacksPublicKey(publicKeyHex);

    const derivedAddress = addressFromPublicKeys(
      AddressVersion.MainnetSingleSig,
      AddressHashMode.SerializeP2PKH,
      1,
      [publicKey]
    );

    const recoveredPrincipal = addressToString(derivedAddress);

    if (recoveredPrincipal !== refund.seller_principal) {
      logger.warn('Refund authorization signature mismatch', {
        expected: refund.seller_principal,
        recovered: recoveredPrincipal,
        dispute_id: refund.dispute_id,
      });
      return null;
    }

    return recoveredPrincipal;
  } catch (error) {
    logger.error('Failed to verify refund authorization signature', {
      error: error instanceof Error ? error.message : 'Unknown error',
      dispute_id: refund.dispute_id,
    });
    return null;
  }
}
