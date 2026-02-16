import { useQuery } from '@tanstack/react-query';
import {
    standardPrincipalCV,
    cvToHex,
    deserializeCV,
    cvToJSON
} from '@stacks/transactions';

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_SERVICE_REGISTRY?.split('.')[0] || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const REGISTRY_NAME = process.env.NEXT_PUBLIC_SERVICE_REGISTRY?.split('.')[1] || 'service-registry';

const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_MAP?.split('.')[0] || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const REPUTATION_NAME = process.env.NEXT_PUBLIC_REPUTATION_MAP?.split('.')[1] || 'reputation-map';

const API_URL = process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';

export interface ServiceData {
    endpoint_hash: string;
    policy_hash: string;
    bns_name: string | null;
    registered_at: number;
    stake_amount: number;
    active: boolean;
    updated_at: number;
    // Reputation Data
    reputation_score: number;
    key_version: number;
}

async function callReadOnly({
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    senderAddress
}: {
    contractAddress: string,
    contractName: string,
    functionName: string,
    functionArgs: any[],
    senderAddress: string
}) {
    const url = `${API_URL}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
    const args = functionArgs.map(arg => cvToHex(arg));

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: senderAddress, arguments: args })
    });

    if (!response.ok) throw new Error(`Read-only call failed: ${response.statusText}`);

    const json = await response.json();
    if (json.okay && json.result) return deserializeCV(json.result);
    throw new Error('Invalid response from Stacks API');
}

async function fetchService(principal: string): Promise<ServiceData | null> {
    try {
        // Parallel fetch for Service Info and Reputation Info
        const [registryRes, reputationRes, keyRes] = await Promise.all([
            callReadOnly({
                contractAddress: REGISTRY_ADDRESS,
                contractName: REGISTRY_NAME,
                functionName: 'get-service',
                functionArgs: [standardPrincipalCV(principal)],
                senderAddress: principal,
            }),
            callReadOnly({
                contractAddress: REPUTATION_ADDRESS,
                contractName: REPUTATION_NAME,
                functionName: 'get-reputation',
                functionArgs: [standardPrincipalCV(principal)],
                senderAddress: principal,
            }).catch(() => null),
            callReadOnly({
                contractAddress: REPUTATION_ADDRESS,
                contractName: REPUTATION_NAME,
                functionName: 'get-signing-key-version',
                functionArgs: [standardPrincipalCV(principal)],
                senderAddress: principal,
            }).catch(() => null)
        ]);

        const registryJson = cvToJSON(registryRes);
        if (registryJson.type === 'success' && registryJson.value && registryJson.value.type === 'some') {
            const tuple = registryJson.value.value.value;

            // Reputation parsing
            let score = 0;
            if (reputationRes) {
                const repJson = cvToJSON(reputationRes);
                if (repJson.type === 'success' && repJson.value && repJson.value.type === 'some') {
                    score = Number(repJson.value.value.value['score'].value);
                }
            }

            // Key version parsing
            let keyVersion = 1;
            if (keyRes) {
                const keyJson = cvToJSON(keyRes);
                if (keyJson.type === 'success' && keyJson.value && keyJson.value.type === 'some') {
                    keyVersion = Number(keyJson.value.value.value['key-version'].value);
                }
            }

            return {
                endpoint_hash: tuple['endpoint-hash'].value,
                policy_hash: tuple['policy-hash'].value,
                bns_name: tuple['bns-name'].type === 'some' ? tuple['bns-name'].value : null,
                registered_at: Number(tuple['registered-at'].value),
                stake_amount: Number(tuple['stake-amount'].value) / 1_000_000,
                active: (tuple['active'].type === 'true' || tuple['active'].value === true),
                updated_at: Number(tuple['updated-at'].value),
                reputation_score: score,
                key_version: keyVersion
            };
        }

        return null;
    } catch (error) {
        console.warn(`Could not fetch service for ${principal}`, error);
        return null;
    }
}

export function useService(principal: string | null) {
    return useQuery({
        queryKey: ['service', principal],
        queryFn: () => fetchService(principal!),
        enabled: !!principal,
        staleTime: 1000 * 60,
    });
}
