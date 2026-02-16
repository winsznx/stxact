import { Router, Request, Response } from 'express';
import { createX402PaymentGate } from '../middleware/x402-payment-gate';
import { generateReceiptMiddleware } from '../middleware/generate-receipt';
import { logger } from '../config/logger';

const router = Router();

/**
 * Demo Protected Endpoint
 *
 * This endpoint demonstrates the complete stxact payment flow:
 * 1. x402 payment gate (using official x402-stacks library)
 * 2. Payment binding (stxact replay protection)
 * 3. Business logic (this endpoint)
 * 4. Receipt generation (stxact cryptographic receipt)
 * 5. Reputation update (fire-and-forget)
 *
 * Example Usage:
 * 1. Request without payment → 402 Payment Required
 * 2. Client pays with x402-stacks library
 * 3. Retry request with payment-signature header → 200 OK + receipt
 *
 * PRD Reference: Section 6 - Complete Payment Flow
 */

// Create payment gate middleware
const paymentGate = createX402PaymentGate({
  amountSTX: 0.1, // 0.1 STX required
  payTo: process.env.SERVICE_PRINCIPAL!,
  network: (process.env.STACKS_NETWORK || 'testnet') as 'mainnet' | 'testnet',
  facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.stacksx402.com',
  description: 'Demo premium data endpoint',
});

/**
 * GET /demo/premium-data
 * Protected endpoint requiring x402 payment
 */
router.get(
  '/premium-data',
  paymentGate, // x402 payment verification + stxact binding
  generateReceiptMiddleware, // Generate cryptographic receipt
  async (req: Request, res: Response) => {
    try {
      const verifiedPayment = (req as any).verifiedPayment;
      const requestHash = (req as any).requestHash;

      logger.info('Serving premium data', {
        payment_txid: verifiedPayment.payment_txid,
        request_hash: requestHash,
        payer: verifiedPayment.payer,
      });

      // Business logic: return premium data
      res.status(200).json({
        data: {
          timestamp: Date.now(),
          message: 'This is premium data',
          insights: [
            'Market analysis data point 1',
            'Market analysis data point 2',
            'Market analysis data point 3',
          ],
          metrics: {
            value1: 42.5,
            value2: 99.9,
            value3: 13.37,
          },
        },
        payment_info: {
          txid: verifiedPayment.payment_txid,
          amount: verifiedPayment.amount,
          payer: verifiedPayment.payer,
        },
      });

      // Note: Receipt is automatically generated and added to response headers
      // by generateReceiptMiddleware
    } catch (error) {
      logger.error('Failed to serve premium data', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'internal_error',
        message: 'Failed to process request',
      });
    }
  }
);

/**
 * POST /demo/ai-inference
 * Protected endpoint with tiered pricing based on model size
 */
router.post(
  '/ai-inference',
  paymentGate, // x402 payment verification
  generateReceiptMiddleware, // Generate receipt
  async (req: Request, res: Response) => {
    try {
      const { prompt, model } = req.body;

      if (!prompt) {
        res.status(400).json({
          error: 'missing_prompt',
          message: 'Prompt is required',
        });
        return;
      }

      logger.info('Processing AI inference request', {
        model: model || 'default',
        prompt_length: prompt.length,
      });

      // Simulate AI inference
      const result = {
        model: model || 'gpt-4',
        response: `Generated response for: "${prompt.substring(0, 50)}..."`,
        tokens_used: Math.floor(prompt.length * 1.5),
        processing_time_ms: Math.floor(Math.random() * 2000) + 500,
      };

      res.status(200).json({
        result,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('AI inference failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'inference_failed',
        message: 'Failed to process AI inference',
      });
    }
  }
);

export default router;
