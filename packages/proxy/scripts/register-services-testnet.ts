import { makeContractCall, broadcastTransaction, AnchorMode, stringAsciiCV, bufferCVFromString, someCV, noneCV, uintCV } from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'stxact',
    user: process.env.POSTGRES_USER || 'macbook',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
});

const network = new StacksTestnet();
const [contractAddress, contractName] = process.env.SERVICE_REGISTRY_ADDRESS!.split('.');
const privateKey = process.env.SELLER_PRIVATE_KEY!;

async function registerServices() {
    console.log('Connecting to database:', process.env.POSTGRES_DB);
    console.log('Contract:', process.env.SERVICE_REGISTRY_ADDRESS);
    console.log('');

    const result = await pool.query('SELECT * FROM services WHERE active = true ORDER BY service_id');

    console.log(`Found ${result.rows.length} services to register on-chain\n`);

    for (const service of result.rows) {
        console.log(`Registering: ${service.bns_name || service.principal}`);
        console.log(`  Principal: ${service.principal}`);
        console.log(`  Endpoint: ${service.endpoint_url}`);
        console.log(`  Category: ${service.category}`);

        try {
            // Convert endpoint URL to hash (first 32 bytes of SHA256)
            const crypto = await import('crypto');
            const endpointHash = crypto.createHash('sha256')
                .update(service.endpoint_url)
                .digest()
                .slice(0, 32);

            const policyHash = Buffer.from(service.policy_hash.padEnd(64, '0').slice(0, 64), 'hex');

            const tx = await makeContractCall({
                contractAddress,
                contractName,
                functionName: 'register-service',
                functionArgs: [
                    bufferCVFromString(endpointHash.toString('hex')),
                    bufferCVFromString(policyHash.toString('hex')),
                    service.bns_name ? someCV(stringAsciiCV(service.bns_name)) : noneCV(),
                    uintCV(service.stake_amount || 100_000_000),
                ],
                senderKey: privateKey,
                network,
                anchorMode: AnchorMode.Any,
                fee: BigInt(10000),
            });

            const broadcastResponse: any = await broadcastTransaction(tx, network);

            if (broadcastResponse.error) {
                console.error(`  ✗ Error:`, broadcastResponse.error);
                console.error(`  Reason:`, broadcastResponse.reason);
            } else {
                console.log(`  ✓ Transaction broadcast: ${broadcastResponse.txid}`);
                console.log(`  View: https://explorer.hiro.so/txid/${broadcastResponse.txid}?chain=testnet`);
            }

            console.log('  Waiting 30 seconds for confirmation...\n');
            await new Promise(resolve => setTimeout(resolve, 30000));

        } catch (error) {
            console.error(`  ✗ Failed:`, error instanceof Error ? error.message : error);
            console.log('');
        }
    }

    console.log('✓ Registration complete');
    await pool.end();
    process.exit(0);
}

registerServices().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
