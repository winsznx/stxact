#!/usr/bin/env node

import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function normalizeBaseUrl(value, fallback) {
  return (value || fallback).replace(/\/+$/, '');
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function ensureFileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
  } catch {
    throw new Error(`Required file not found: ${filePath}`);
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: HTTP ${response.status}`);
  }

  return response.json();
}

async function runCli(cliEntry, args, env) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliEntry, ...args], {
    cwd: path.resolve('.'),
    env,
  });

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

function parseJson(name, raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${name} did not return valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const apiUrl = normalizeBaseUrl(process.env.STXACT_API_URL, 'http://localhost:3001');
  const webUrl = normalizeBaseUrl(process.env.STXACT_WEB_URL, 'http://localhost:3000');
  const paidEndpoint = process.env.STXACT_PAID_ENDPOINT || `${apiUrl}/demo/premium-data`;
  const buyerWallet = requireEnv('STXACT_BUYER_WALLET');
  const sellerWallet = requireEnv('STXACT_SELLER_WALLET');
  const refundAmount = process.env.STXACT_REFUND_AMOUNT || '100000';
  const disputeReason = process.env.STXACT_DISPUTE_REASON || 'no_response';
  const disputeEvidence = process.env.STXACT_DISPUTE_EVIDENCE || 'Automated testnet verification run';
  const outputDir = path.resolve(process.env.STXACT_E2E_OUTPUT_DIR || 'artifacts/testnet-e2e');
  const cliEntry = path.resolve('packages/cli/dist/index.js');

  await Promise.all([
    ensureFileExists(cliEntry),
    ensureFileExists(path.resolve(buyerWallet)),
    ensureFileExists(path.resolve(sellerWallet)),
  ]);
  await mkdir(outputDir, { recursive: true });

  const env = {
    ...process.env,
    STXACT_API_URL: apiUrl,
  };

  const serviceConfig = await fetchJson(`${apiUrl}/.well-known/stxact-config`);
  await writeFile(
    path.join(outputDir, 'service-config.json'),
    JSON.stringify(serviceConfig, null, 2),
    'utf8'
  );

  const receiptOutputPath = path.join(outputDir, 'receipt.json');
  const curlResult = await runCli(
    cliEntry,
    ['curl', paidEndpoint, '--wallet', buyerWallet, '--verify', '--output', receiptOutputPath],
    env
  );
  await writeFile(path.join(outputDir, 'curl.stdout.json'), curlResult.stdout, 'utf8');

  const curlJson = parseJson('stxact curl', curlResult.stdout);
  const receiptId = curlJson?.receipt?.receipt_id;
  if (!receiptId) {
    throw new Error('Paid request completed without a receipt_id');
  }

  const verifyResult = await runCli(cliEntry, ['verify-receipt', receiptOutputPath, '--on-chain'], env);
  await writeFile(path.join(outputDir, 'verify-receipt.txt'), verifyResult.stdout, 'utf8');

  const disputeCreateResult = await runCli(
    cliEntry,
    ['dispute', 'create', receiptId, disputeReason, '--wallet', buyerWallet, '--evidence', disputeEvidence],
    env
  );
  await writeFile(path.join(outputDir, 'dispute-create.json'), disputeCreateResult.stdout, 'utf8');

  const disputeCreateJson = parseJson('stxact dispute create', disputeCreateResult.stdout);
  const disputeId = disputeCreateJson?.dispute_id;
  if (!disputeId) {
    throw new Error('Dispute creation completed without a dispute_id');
  }

  const disputeOpenResult = await runCli(cliEntry, ['dispute', 'status', disputeId], env);
  await writeFile(path.join(outputDir, 'dispute-status-open.json'), disputeOpenResult.stdout, 'utf8');

  const refundResult = await runCli(
    cliEntry,
    ['dispute', 'refund', disputeId, refundAmount, '--wallet', sellerWallet],
    env
  );
  await writeFile(path.join(outputDir, 'dispute-refund.json'), refundResult.stdout, 'utf8');

  const disputeRefundedResult = await runCli(cliEntry, ['dispute', 'status', disputeId], env);
  await writeFile(path.join(outputDir, 'dispute-status-refunded.json'), disputeRefundedResult.stdout, 'utf8');

  const summary = {
    api_url: apiUrl,
    web_url: webUrl,
    paid_endpoint: paidEndpoint,
    receipt_id: receiptId,
    dispute_id: disputeId,
    receipt_url: `${webUrl}/receipts/${receiptId}`,
    dispute_url: `${webUrl}/disputes/${disputeId}`,
    verify_url: `${webUrl}/receipts/verify`,
    output_dir: outputDir,
  };

  await writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
