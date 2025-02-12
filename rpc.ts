// rpc.ts

import fs from 'fs';
import http from 'http';

import { asserts, fromHex, jsonReplacerForRpc, now, toHex } from './utils';
import { Blockchain } from "./blockchain";
import { Block } from "./block";
import { Account } from './account';
import { decodeRawTransaction, handleEthCall, handleEthSendTransaction, Transaction, transcodeTx } from './transaction';
import { execVm } from './vm';

import type { HexNumber } from './types/types';
import type { TransactionData, TransactionHash } from './types/transaction.types';
import type { BlockHash, BlockParameter } from './types/block.types';
import type { AbiClassMethod, AccountAddress, CodeAbiCall } from './types/account.types';
import { decodeCallData, findMethodAbi } from './abi';
import { RpcMessageError, RpcMessageResult, callTxParams, sendTxParams } from './types/rpc.types';


/* ######################################################### */


export async function rpcListen(blockchain: Blockchain, rpcPort: number) {

    // Création du serveur HTTP / RPC
    const server = http.createServer(async (req, res) => {

        // Ajout des en-têtes CORS pour autoriser les requêtes
        res.setHeader('Access-Control-Allow-Origin', '*');  // Permet toutes les origines
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Gérer les requêtes HTTP normales
        if (req.method === 'GET') {
            return handleHttpRequest(blockchain, req, res);
        }

        // Gestion des requêtes OPTIONS (préflight request)
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }

        // Gestion des requêtes POST (pour le RPC)
        if (req.method === 'POST') {
            return handleRpcRequest(blockchain, req, res);
        }


        // Not allowed method
        res.writeHead(405, { 'Content-Type': 'application/json' });

        const message: RpcMessageError = {
            jsonrpc: "2.0",
            id: null,
            error: "Method Not Allowed"
        };

        return res.end(JSON.stringify(message));

    });

    // 2. listen for new transactions (from rpc)
    server.listen(rpcPort, () => console.log(`[${now()}][RPC] 🚀 RPC Server running on http://0.0.0.0:${rpcPort}`));

    return server;
}



function handleHttpRequest(blockchain: Blockchain, req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage> & {req: http.IncomingMessage}): void {
    if (req.url === '/') {
        const templateFilepath = `${__dirname}/www/deploy.html`;

        if (! fs.existsSync(templateFilepath)) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end("Page Not Found");
            return;
        }

        const content = fs.readFileSync(templateFilepath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
        return;
    }
}


function handleRpcRequest(blockchain: Blockchain, req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage> & {req: http.IncomingMessage}): void {
    let body = '';

    req.on('data', chunk => (body += chunk.toString()));

    req.on('end', async () => {
        try {
            if (!body) {
                throw new Error("Requête vide !");
            }

            const { jsonrpc, id, method, params } = JSON.parse(body);
            console.log(`[${now()}][RPC] 📩 Requête RPC reçue: ${method}`, params);


            let result: string | object | null | boolean = null;

            switch (method) {
                case 'eth_chainId': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_chainId/
                    const chainId = blockchain.getChainId();

                    result = toHex(chainId) as HexNumber;
                    break;
                }

                case 'eth_blockNumber': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_blocknumber/

                    result = toHex(blockchain.blockHeight) as HexNumber;
                    break;
                }

                case 'eth_getBalance': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getBalance/
                    // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_getbalance/
                    const [address, blockNumber] = params as [AccountAddress, HexNumber];

                    const account: Account = blockchain.getAccount(address, null);

                    result = toHex(account.balance) as HexNumber;
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
                        asserts(blockParameter === 'latest', `blockParameter "${blockParameter}" not implemented`);

                        const block: Block | null = blockchain.getBlock(blockchain.blockHeight);
                        asserts(block, `block "${blockParameter}" not found`)

                        result = Block.formatForRpc(block, showTransactionsDetails) as object;
                    }
                    break;
                }

                case 'net_version': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/net_version/
                    const networkVersion: number = blockchain.getNetworkVersion();

                    result = networkVersion.toString() as string;
                    break;
                }

                case 'eth_getBlockByHash': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getBlockByHash/
                    const [blockHash, showTransactionsDetails] = params as [BlockHash, showTransactionsDetails?: boolean];

                    const block = blockchain.getBlockByHash(blockHash);
                    asserts(block, `block not found for block "${blockHash}"`);

                    result = Block.formatForRpc(block) as object;

                    break;
                }

                case 'eth_getTransactionByBlockNumberAndIndex': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyblocknumberandindex/
                    const [blockHeight, transactionIndex] = params as [blockHeight: number, transactionIndex: number];

                    const block = blockchain.getBlock(blockHeight);
                    asserts(block, `block not found for transaction "${transactionIndex}" of block "${blockHeight}"`);

                    const tx = block.transactions[transactionIndex];
                    asserts(tx, `transaction "${transactionIndex}" of block "${blockHeight}" not found`);

                    result = Transaction.formatForRpc(block, tx) as object;
                }

                case 'eth_getTransactionByBlockHashAndIndex': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyblockhashandindex/
                    const [blockHash, transactionIndex] = params as [blockHash: BlockHash, transactionIndex: number];

                    const block = blockchain.getBlockByHash(blockHash);
                    asserts(block, `block not found for transaction "${transactionIndex}" of block "${blockHash}"`);

                    const tx = block.transactions[transactionIndex];
                    asserts(tx, `transaction "${transactionIndex}" of block "${blockHash}" not found`);

                    result = Transaction.formatForRpc(block, tx) as object;
                }

                case 'eth_getTransactionByHash': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyhash/
                    const [txHash] = params as [txHash: TransactionHash];

                    asserts(typeof txHash === 'string', `invalid txHash type`);

                    const tx = blockchain.getTransactionByHash(txHash);
                    asserts(tx, `transaction "${txHash}" not found`);
                    asserts(typeof tx.blockHeight === 'number', `missing blockHeight for transaction "${txHash}"`);
                    asserts(tx.blockHeight > -1, `invalid blockHeight for transaction "${txHash}"`);

                    const block = blockchain.getBlock(tx.blockHeight);
                    asserts(block, `block not found for transaction "${txHash}"`);

                    result = Transaction.formatForRpc(block, tx) as object;
                    break;
                }

                case 'eth_getTransactionReceipt': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionreceipt/
                    const [txHash] = params as [txHash: TransactionHash];

                    asserts(typeof txHash === 'string', `invalid txHash type`);

                    //asserts(typeof blockHeight === 'number', `transaction "${txHash}" has no blockHeight`);

                    if (txHash in blockchain.stateManager.transactionsIndex) {
                        const blockHeight = blockchain.stateManager.transactionsIndex[txHash];

                        const tx = blockchain.getTransactionByHash(txHash);
                        asserts(tx, `transaction "${txHash}" not found`);

                        const block = blockchain.getBlock(blockHeight);
                        asserts(block, `block "${blockHeight}" not found`)

                        result = Transaction.formatReceiptForRpc(block, tx) as object;

                    } else {
                        result = null;
                    }

                    break;
                }

                case 'eth_getTransactionCount': {
                    const [address, blockNumber] = params;

                    const account = blockchain.getAccount(address, null);

                    result = toHex(account.transactionsCount) as HexNumber;
                    break;
                }

                case 'eth_gasPrice': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gasPrice/

                    result = '0x6bcc886e7' as HexNumber;
                    break;
                }

                case 'eth_estimateGas': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_estimategas/
                    const [args] = params as [args: { from: AccountAddress, value: HexNumber, gasPrice: HexNumber, data: HexNumber, to: AccountAddress }];

                    // Warning: To prevent abuse of the API, the gas parameter in this eth_estimateGas method and in eth_call is capped at 10x (1000%) the current block gas limit

                    result = '0x5208' as HexNumber;
                    break;
                }

                case 'eth_getCode': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getCode/
                    const [address, blockNumber] = params as [address: AccountAddress, blockNumber: HexNumber];

                    result = '0x' as HexNumber;
                    break;
                }

                case 'eth_getLogs': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_getlogs/
                    // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_getlogs/
                    // TODO
                    result = '0x' as HexNumber;
                    break;
                }

                case 'eth_sendRawTransaction': {
                    const [txRawData] = params as [string];

                    // Décode la transaction brute
                    const txData: TransactionData = decodeRawTransaction(blockchain, txRawData.slice(2));

                    // Soumet la transaction décodée au mempool
                    const txHash = await handleEthSendTransaction(blockchain, txData);

                    result = txHash;
                    break;
                }

                case 'eth_sendTransaction': {
                    // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_sendtransaction/
                    const [txParams] = params as [sendTxParams];

                    // Transcode les txParams au format TransactionData
                    const txData: TransactionData = transcodeTx(blockchain, txParams);

                    // Soumet la transaction (non-encodée) au mempool
                    result = await handleEthSendTransaction(blockchain, txData);
                    break;
                }

                case 'eth_call': {
                    // https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_call/
                    // https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_call/
                    const [txParams, blockParameter] = params as [callTxParams, BlockParameter];

                    // Execute l'appel du contrat dans la VM et retourne le résultat
                    result = await handleEthCall(blockchain, txParams);
                    break;
                }


                case 'debug_getAccount': {
                    const account: Account = blockchain.getAccount(params[0], null);

                    result = account.toData() as object;
                    break;
                }

                case 'debug_getBlock': {
                    const block: Block | null = blockchain.getBlock(params[0]);

                    result = block ? block.toData() : null;
                    break;
                }

                default:
                    throw new Error(`Méthode RPC inconnue: ${method}`);
            }

            const message: RpcMessageResult = {
                jsonrpc,
                id: id ?? 1,
                result,
            };

            const json = JSON.stringify(message, jsonReplacerForRpc);

            console.log(`[${now()}][RPC] ✅ Réponse envoyée:`, json);

            res.writeHead(200, { 'Content-Type': 'application/json' });

            res.end(json);

        } catch (err: any) {
            console.log(`[${now()}][RPC] ❌ Erreur:`, err.message);

            if (!res.headersSent) {
                res.writeHead(400, { 'Content-Type': 'application/json' });

                const message: RpcMessageError = {
                    jsonrpc: "2.0",
                    id: null,
                    error: err.message,
                };

                res.end(JSON.stringify(message));
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

            const message: RpcMessageError = { jsonrpc: '', id: null, error: 'Erreur interne du serveur' };
            res.end(JSON.stringify(message));
        }
    });
}




