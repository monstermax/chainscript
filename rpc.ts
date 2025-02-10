// rpc.ts

import http from 'http';

import { asserts, fromHex, jsonReplacerForRpc, toHex } from './utils';
import { Blockchain } from "./blockchain";
import { Block } from "./block";
import { Account } from './account';
import { decodeTx, Transaction } from './transaction';

import type { HexNumber } from './types/types';
import { TransactionData, TransactionHash } from './types/transaction.types';
import { BlockHash } from './types/block.types';
import { AccountAddress } from './types/account.types';


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
                console.log(`[Server] 📩 Requête RPC reçue: ${method}`, params);

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
                        const [address, blockNumber] = params as [address: AccountAddress, blockNumber: HexNumber];

                        const account = blockchain.getAccount(address);
                        result = toHex(account.balance);
                        break;
                    }

                    case 'eth_getBlockByNumber': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getBlockByNumber/
                        const [blockNumber, showTransactionsDetails] = params as [HexNumber | 'latest', showTransactionsDetails?: boolean];

                        if (blockNumber === "latest") {
                            const block: Block | null = blockchain.getBlock(blockchain.blockHeight);
                            asserts(block, `block "${blockNumber}" not found`)
                            result = Block.formatForRpc(block, showTransactionsDetails);

                        } else {
                            const blockHeight: number = fromHex(blockNumber);
                            const block: Block | null = blockchain.getBlock(blockHeight);
                            asserts(block, `block "${blockNumber}" not found`)
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

                        const blockHeight = blockchain.stateManager.blocksIndex.findIndex((_blockHash: BlockHash) => _blockHash === blockHash);
                        asserts(blockHeight > -1, `block not found for block "${blockHeight}"`);

                        const block = blockchain.getBlock(blockHeight);
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

                        const blockHeight = blockchain.stateManager.blocksIndex.findIndex((_blockHash: BlockHash) => _blockHash === blockHash);
                        const block = blockchain.getBlock(blockHeight);
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
                        const [args] = params as [args: { from: AccountAddress, value: HexNumber, gasPrice: HexNumber, data: HexNumber, to: AccountAddress }];

                        result = '0x5cec';
                        break;
                    }

                    case 'eth_getCode': {
                        // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getCode/
                        const [address, blockNumber] = params as [address: AccountAddress, blockNumber: HexNumber];

                        result = '0x';
                        break;
                    }

                    case 'eth_sendRawTransaction': {
                        const [txRawData] = params as [txRawData: string];

                        const txData: TransactionData = decodeTx(txRawData.slice(2));

                        const tx = new Transaction(txData.from, txData.amount, txData.nonce);
                        tx.instructions = txData.instructions;

                        blockchain.mempool.addTransaction(tx);
                        result = tx.hash;
                        break;
                    }

                    case 'debug_getAccount': {
                        const account: Account = blockchain.getAccount(params[0]);

                        result = Account.toJSON(account);
                        break;
                    }

                    case 'debug_getBlock': {
                        const block: Block | null = blockchain.getBlock(params[0]);

                        result = block ? Block.toJSON(block) : null;
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

                console.log(`[Server] ✅ Réponse envoyée:`, json);

                res.writeHead(200, { 'Content-Type': 'application/json' });

                res.end(json);

            } catch (err: any) {
                console.log(`[Server] ❌ Erreur:`, err.message);

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
            console.log(`[Server] Connexion RPC terminée`, "\n");
        });

        req.on('error', (err) => {
            console.error('[Server] ❌ Erreur requête:', err.message);

            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Connection': 'close' });
                res.end(JSON.stringify({ error: 'Erreur interne du serveur' }));
            }
        });
    });

    // 2. listen for new transactions (from rpc)
    server.listen(rpcPort, () => console.log(`🚀 RPC Server running on http://0.0.0.0:${rpcPort}`));
}

