// rpc.ts

import http from 'http';
import { keccak256 } from "ethereum-cryptography/keccak";
import { AbiCoder, toUtf8Bytes } from "ethers";

import { asserts, fromHex, jsonReplacerForRpc, now, toHex } from './utils';
import { Blockchain } from "./blockchain";
import { Block } from "./block";
import { Account } from './account';
import { decodeTx, Transaction } from './transaction';
import { execVm } from './vm';

import type { HexNumber } from './types/types';
import type { TransactionData, TransactionHash } from './types/transaction.types';
import type { BlockHash } from './types/block.types';
import type { AccountAddress, CodeAbi, CodeAbiMethod } from './types/account.types';


/* ######################################################### */

type BlockParameter = HexNumber | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized'; // spec => https://ethereum.org/en/developers/docs/apis/json-rpc/#default-block

type TxParams = {
    from: AccountAddress,
    to?: AccountAddress,
    gas?: HexNumber,
    gasPrice?: HexNumber,
    maxPriorityFeePerGas?: HexNumber,
    maxFeePerGas?: HexNumber,
    value?: HexNumber,
    data?: HexNumber, // Hash of the method signature and encoded parameters // spec => https://docs.soliditylang.org/en/latest/abi-spec.html
}

/* ######################################################### */


export async function rpcListen(blockchain: Blockchain, rpcPort: number) {

    // 1. start rpc server
    const server = http.createServer(async (req, res) => {

        // Ajout des en-têtes CORS pour autoriser les requêtes
        res.setHeader('Access-Control-Allow-Origin', '*');  // Permet toutes les origines
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');


        // Gestion des requêtes OPTIONS (préflight request)
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }


        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });

            return res.end(JSON.stringify({
                jsonrpc: "2.0",
                id: null,
                error: "Method Not Allowed"
            }));
        }

        let body = '';

        req.on('data', chunk => (body += chunk.toString()));

        req.on('end', async () => {
            try {
                if (!body) {
                    throw new Error("Requête vide !");
                }

                const { jsonrpc, id, method, params } = JSON.parse(body);
                console.log(`[${now()}][RPC] 📩 Requête RPC reçue: ${method}`, params);

                let result;
                switch (method) {
                    case 'eth_chainId': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_chainId/
                        const chainId = blockchain.getChainId();
                        result = toHex(chainId);
                        break;
                    }

                    case 'eth_blockNumber': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_blocknumber/
                        result = toHex(blockchain.blockHeight);
                        break;
                    }

                    case 'eth_getBalance': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getBalance/
                        // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_getbalance/
                        const [address, blockNumber] = params as [AccountAddress, HexNumber];

                        const account = blockchain.getAccount(address);
                        result = toHex(account.balance);
                        break;
                    }

                    case 'eth_getBlockByNumber': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getBlockByNumber/
                        const [blockParameter, showTransactionsDetails] = params as [BlockParameter, boolean];

                        if (blockParameter.startsWith('0x')) {
                            const blockHeight: number = fromHex(blockParameter as HexNumber);
                            const block: Block | null = blockchain.getBlock(blockHeight);
                            asserts(block, `block "${blockParameter}" not found`)
                            result = Block.formatForRpc(block, showTransactionsDetails);

                        } else {
                            asserts(blockParameter === 'latest', `blockParameter not implemented`);
                            const block: Block | null = blockchain.getBlock(blockchain.blockHeight);
                            asserts(block, `block "${blockParameter}" not found`)
                            result = Block.formatForRpc(block, showTransactionsDetails);
                        }
                        break;
                    }

                    case 'net_version': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/net_version/
                        const networkVersion = blockchain.getNetworkVersion();
                        result = networkVersion;
                        break;
                    }

                    case 'eth_getBlockByHash': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getBlockByHash/
                        const [blockHash, showTransactionsDetails] = params as [BlockHash, showTransactionsDetails?: boolean];

                        const block = blockchain.getBlockByHash(blockHash);
                        asserts(block, `block not found for block "${blockHash}"`);

                        result = Block.formatForRpc(block);

                        break;
                    }

                    case 'eth_getTransactionByBlockNumberAndIndex': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyblocknumberandindex/
                        const [blockHeight, transactionIndex] = params as [blockHeight: number, transactionIndex: number];

                        const block = blockchain.getBlock(blockHeight);
                        asserts(block, `block not found for transaction "${transactionIndex}" of block "${blockHeight}"`);

                        const tx = block.transactions[transactionIndex];
                        asserts(tx, `transaction "${transactionIndex}" of block "${blockHeight}" not found`);
                        result = Transaction.formatForRpc(block, tx);
                    }

                    case 'eth_getTransactionByBlockHashAndIndex': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyblockhashandindex/
                        const [blockHash, transactionIndex] = params as [blockHash: BlockHash, transactionIndex: number];

                        const block = blockchain.getBlockByHash(blockHash);
                        asserts(block, `block not found for transaction "${transactionIndex}" of block "${blockHash}"`);

                        const tx = block.transactions[transactionIndex];
                        asserts(tx, `transaction "${transactionIndex}" of block "${blockHash}" not found`);
                        result = Transaction.formatForRpc(block, tx);
                    }

                    case 'eth_getTransactionByHash': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyhash/
                        const [txHash] = params as [txHash: TransactionHash];

                        const tx = blockchain.getTransactionByHash(txHash);
                        asserts(tx, `transaction "${txHash}" not found`);
                        asserts(typeof tx.blockHeight === 'number', `missing blockHeight for transaction "${txHash}"`);
                        asserts(tx.blockHeight > -1, `invalid blockHeight for transaction "${txHash}"`);

                        const block = blockchain.getBlock(tx.blockHeight);
                        asserts(block, `block not found for transaction "${txHash}"`);

                        result = Transaction.formatForRpc(block, tx);
                        break;
                    }

                    case 'eth_getTransactionReceipt': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionreceipt/
                        const [txHash] = params as [txHash: TransactionHash];

                        const blockHeight = blockchain.stateManager.transactionsIndex[txHash];
                        asserts(typeof blockHeight === 'number', `transaction "${txHash}" has no blockHeight`);

                        const tx = blockchain.getTransactionByHash(txHash);
                        asserts(tx, `transaction "${txHash}" not found`);

                        const block = blockchain.getBlock(blockHeight);
                        asserts(block, `block "${blockHeight}" not found`)

                        result = Transaction.formatReceiptForRpc(block, tx);
                        break;
                    }

                    case 'eth_getTransactionCount': {
                        const [address, blockNumber] = params;

                        const account = blockchain.getAccount(address);
                        result = toHex(account.transactionsCount);
                        break;
                    }

                    case 'eth_gasPrice': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gasPrice/
                        result = '0x6bcc886e7';
                        break;
                    }

                    case 'eth_estimateGas': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_estimategas/

                        // Warning: To prevent abuse of the API, the gas parameter in this eth_estimateGas method and in eth_call is capped at 10x (1000%) the current block gas limit

                        const [args] = params as [args: { from: AccountAddress, value: HexNumber, gasPrice: HexNumber, data: HexNumber, to: AccountAddress }];

                        result = '0x5208';
                        break;
                    }

                    case 'eth_getCode': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getCode/
                        const [address, blockNumber] = params as [address: AccountAddress, blockNumber: HexNumber];

                        result = '0x';
                        break;
                    }

                    case 'eth_getLogs': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getlogs/
                        // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_getlogs/
                        // TODO
                        result = '0x';
                        break;
                    }

                    case 'eth_sendRawTransaction': {
                        const [txRawData] = params as [string];

                        const txData: TransactionData = decodeTx(txRawData.slice(2));

                        const tx = Transaction.from(txData);
                        tx.instructions = txData.instructions;

                        blockchain.mempool.addTransaction(tx);
                        result = tx.hash;
                        break;
                    }

                    case 'eth_sendTransaction': {
                        // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_sendtransaction/
                        const [txParams] = params as [TxParams];

                        break;
                    }

                    case 'eth_call': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_call/
                        // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_call/
                        const [txParams, blockParameter] = params as [TxParams, BlockParameter];
                        const { to, data } = txParams;

                        console.log(`[Server] 📩 Requête eth_call reçue`, { to, data });

                        if (to) {
                            // call contract
                            asserts(data, `missing data in eth_call`);

                            // Vérifier que le smart contract existe
                            const contract = blockchain.getAccount(to);
                            if (!contract) {
                                throw new Error(`[eth_call] Contrat introuvable à ${to}`);
                            }

                            asserts(contract.abi, `[eth_call] missing contract abi`);
                            asserts(contract.code, `[eth_call] missing contract code`);

                            // Décoder la méthode demandée
                            const methodSignature = data.slice(0, 10); // Les 4 premiers bytes de `keccak256(signature)`
                            const methodAbi = findMethodAbi(contract.abi, methodSignature);

                            if (!methodAbi) {
                                throw new Error(`[eth_call] Méthode inconnue pour le contrat à ${to}`);
                            }

                            // Extraire les arguments
                            const args = decodeCallData(data, methodAbi);

                            console.log(`[eth_call] Exécution de ${methodAbi.name}(${args.join(', ')})`);

                            // Exécuter le contrat dans ta VM
                            const vmMonitor = { counter: 0 };
                            const result = await execVm(blockchain, '0x0000000000000000000000000000000000000000', to, contract.abi[0].class, methodAbi.name, args, vmMonitor);

                            console.log(`[eth_call] ✅ Résultat:`, result);

                        } else {
                            // create contract
                            asserts(data, `contract creation not implemented`);
                        }
                        break;
                    }


                    case 'debug_getAccount': {
                        const account: Account = blockchain.getAccount(params[0]);

                        result = account.toJSON();
                        break;
                    }

                    case 'debug_getBlock': {
                        const block: Block | null = blockchain.getBlock(params[0]);

                        result = block ? block.toJSON() : null;
                        break;
                    }

                    default:
                        throw new Error(`Méthode RPC inconnue: ${method}`);
                }

                const json = JSON.stringify({
                    jsonrpc,
                    id: id ?? 1,
                    result,
                }
                    , jsonReplacerForRpc);

                console.log(`[${now()}][RPC] ✅ Réponse envoyée:`, json);

                res.writeHead(200, { 'Content-Type': 'application/json' });

                res.end(json);

            } catch (err: any) {
                console.log(`[${now()}][RPC] ❌ Erreur:`, err.message);

                if (!res.headersSent) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });

                    res.end(JSON.stringify({
                        jsonrpc: "2.0",
                        id: null,
                        error: err.message,
                    }));
                }
            }
        });

        req.on('close', () => {
            //console.log(`[${now()}][RPC] Connexion RPC terminée`, "\n");
        });

        req.on('error', (err) => {
            console.error(`[${now()}][RPC] ❌ Erreur requête:`, err.message);

            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Connection': 'close' });
                res.end(JSON.stringify({ error: 'Erreur interne du serveur' }));
            }
        });
    });

    // 2. listen for new transactions (from rpc)
    server.listen(rpcPort, () => console.log(`[${now()}][RPC] 🚀 RPC Server running on http://0.0.0.0:${rpcPort}`));

    return server;
}



function findMethodAbi(abi: CodeAbi, methodSignature: string): (CodeAbiMethod & { name: string }) | null {
    for (const contract of abi) {
        for (const [methodName, methodData] of Object.entries(contract.methods)) {
            const inputTypes = (methodData.inputs ?? []).map(input => input.type).join(",");
            const signature = `${methodName}(${inputTypes})`;
            const hash = "0x" + Buffer.from(keccak256(toUtf8Bytes(signature))).toString("hex").slice(0, 8);

            if (hash === methodSignature) {
                return { name: methodName, ...methodData } as CodeAbiMethod & { name: string };
            }
        }
    }

    return null;
}


function decodeCallData(data: string, methodAbi: any) {
    if (!methodAbi.inputs || methodAbi.inputs.length === 0) return [];

    const coder = new AbiCoder();
    const encodedParams = data.slice(10); // Supprime la signature de 4 bytes
    const types = methodAbi.inputs.map((input: any) => input.type);

    return coder.decode(types, "0x" + encodedParams);
}

