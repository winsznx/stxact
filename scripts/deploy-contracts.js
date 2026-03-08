#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  AnchorMode,
  broadcastTransaction,
  estimateContractDeploy,
  getAddressFromPrivateKey,
  getNonce,
  makeContractDeploy,
  TransactionVersion,
} = require('@stacks/transactions');
const { StacksMainnet, StacksTestnet } = require('@stacks/network');

const CONTRACTS = [
  ['service-registry', 'packages/contracts/contracts/service-registry.clar'],
  ['reputation-map', 'packages/contracts/contracts/reputation-map.clar'],
  ['dispute-resolver', 'packages/contracts/contracts/dispute-resolver.clar'],
  ['receipt-anchor', 'packages/contracts/contracts/receipt-anchor.clar'],
];

function getNetworkName() {
  return (process.env.STACKS_NETWORK || process.env.CONTRACT_DEPLOY_NETWORK || 'testnet').toLowerCase() === 'mainnet'
    ? 'mainnet'
    : 'testnet';
}

function getNetwork(networkName) {
  const apiUrl = process.env.STACKS_API_URL;
  if (networkName === 'mainnet') {
    return new StacksMainnet(apiUrl ? { url: apiUrl } : undefined);
  }
  return new StacksTestnet(apiUrl ? { url: apiUrl } : undefined);
}

function getPrivateKey() {
  const key =
    process.env.CONTRACT_DEPLOYER_PRIVATE_KEY ||
    process.env.TESTNET_PRIVATE_KEY ||
    process.env.SELLER_PRIVATE_KEY;

  if (!key) {
    throw new Error(
      'Missing CONTRACT_DEPLOYER_PRIVATE_KEY, TESTNET_PRIVATE_KEY, or SELLER_PRIVATE_KEY in the environment'
    );
  }

  return key.trim().replace(/^0x/, '');
}

function getContractBody(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8');
}

async function buildDeployTransaction({ contractName, codeBody, senderKey, network, nonce, fee }) {
  return makeContractDeploy({
    contractName,
    codeBody,
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
    nonce,
    fee,
  });
}

async function main() {
  const senderKey = getPrivateKey();
  const networkName = getNetworkName();
  const network = getNetwork(networkName);
  const transactionVersion =
    networkName === 'mainnet' ? TransactionVersion.Mainnet : TransactionVersion.Testnet;
  const senderAddress = getAddressFromPrivateKey(senderKey, transactionVersion);
  const dryRun = process.env.DRY_RUN === 'true';
  const feeBuffer = BigInt(process.env.CONTRACT_DEPLOY_FEE_BUFFER || '2000');

  console.log(`network=${networkName}`);
  console.log(`sender=${senderAddress}`);
  console.log(`dry_run=${dryRun}`);

  let nextNonce = BigInt(await getNonce(senderAddress, network));
  console.log(`starting_nonce=${nextNonce.toString()}`);

  for (const [contractName, relativePath] of CONTRACTS) {
    const codeBody = getContractBody(relativePath);
    const previewTx = await buildDeployTransaction({
      contractName,
      codeBody,
      senderKey,
      network,
      nonce: nextNonce,
      fee: 1000n,
    });
    const estimatedFee = BigInt(await estimateContractDeploy(previewTx, network)) + feeBuffer;

    const deployTx = await buildDeployTransaction({
      contractName,
      codeBody,
      senderKey,
      network,
      nonce: nextNonce,
      fee: estimatedFee,
    });

    const contractId = `${senderAddress}.${contractName}`;

    console.log(
      JSON.stringify(
        {
          contract: contractName,
          contract_id: contractId,
          nonce: nextNonce.toString(),
          fee: estimatedFee.toString(),
        },
        null,
        2
      )
    );

    if (!dryRun) {
      const broadcastResponse = await broadcastTransaction(deployTx, network);
      if (broadcastResponse.error) {
        throw new Error(
          `Failed to deploy ${contractName}: ${broadcastResponse.reason || broadcastResponse.error}`
        );
      }

      console.log(JSON.stringify({ contract: contractName, txid: broadcastResponse.txid }, null, 2));
    }

    nextNonce += 1n;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
