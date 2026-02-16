import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { computeRequestHash, getTimestampBucket } from '../crypto/request-hash';
import { logger } from '../config/logger';

/**
 * x402 Challenge Generation Middleware
 *
 * Checks for PAYMENT-SIGNATURE header. If absent, generates 402 challenge.
 * Returns 402 Payment Required with payment requirements and stxact headers.
 *
 * Applies stricter rate limiting (100 req/min) to prevent 402 challenge spam.
 *
 * PRD Reference: Section 6 - Flow 1: Unpaid Request → 402 Challenge
 * PRD Reference: Section 14 - Security Model (DoS Protection, line 2263)
 */

// 402 Challenge rate limiter: 100 per IP per minute
// Prevents denial-of-service via repeated unpaid requests
const challenge402RateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'too_many_challenges', message: 'Too many 402 challenges from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('402 challenge rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'too_many_challenges',
      message: 'Too many 402 challenges from this IP, please try again later',
    });
  },
});

interface PaymentRequirement {
  network: string;
  scheme: string;
  amount: string;
  token: string;
  address: string;
}

export function x402ChallengeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const paymentSignature = req.get('PAYMENT-SIGNATURE');

  if (paymentSignature) {
    // Payment present, proceed to payment verification
    next();
    return;
  }

  // No payment signature, apply rate limiter then generate 402 challenge
  challenge402RateLimiter(req, res, () => {
  const now = Math.floor(Date.now() / 1000);
  const timestampBucket = getTimestampBucket(now);
  const idempotencyKey = req.get('X-Idempotency-Key');

  const requestHash = computeRequestHash(
    req.method,
    req.path,
    typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
    timestampBucket,
    idempotencyKey
  );

  const servicePrincipal = process.env.SERVICE_PRINCIPAL;
  const serviceBnsName = process.env.SERVICE_BNS_NAME || '';
  const servicePolicyHash = process.env.SERVICE_POLICY_HASH || '';

  // Define payment requirements
  const paymentRequirements: { accepts: PaymentRequirement[] } = {
    accepts: [
      {
        network: 'stacks',
        scheme: 'exact',
        amount: '10000', // Default: 10,000 sats (0.0001 sBTC)
        token: 'SP2ASJZHEKV2MBDYWS1HT63WXYXWX49NF.sbtc-token',
        address: servicePrincipal || '',
      },
    ],
  };

  // Encode payment requirements as base64
  const paymentRequiredHeader = Buffer.from(JSON.stringify(paymentRequirements)).toString(
    'base64'
  );

  logger.info('Generated 402 challenge', {
    request_hash: requestHash,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(402);
  res.set({
    'PAYMENT-REQUIRED': paymentRequiredHeader,
    'X-stxact-Request-Hash': requestHash,
    'X-stxact-Service-Principal': servicePrincipal || '',
    'X-stxact-Service-BNS': serviceBnsName,
    'X-stxact-Service-Policy-Hash': servicePolicyHash,
    'Content-Type': 'application/json',
  });

  res.json({
    error: 'payment_required',
    message: 'Payment of 0.00001 sBTC required',
    request_hash: requestHash,
  });
  }); // End of rate limiter callback
}
