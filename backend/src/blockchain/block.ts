// block.ts

import fs from 'fs';

import { asserts, computeHash, jsonReplacer, now, toHex } from '@backend/helpers/utils';
import { Blockchain } from './blockchain';
import { Transaction } from './transaction';
import { executeTransaction } from '@backend/execution/execution';

import type { BlockData, BlockHash, BlockRpc } from '@backend/types/block.types';
import type { AccountAddress, Accounts } from '@backend/types/account.types';
import type { TransactionHash, TransactionRpc } from '@backend/types/transaction.types';
import type { BlockchainMetadata } from '@backend/types/blockchain.types';
import { TransactionReceipt } from './receipt';
import { emptyAddress } from '@backend/config';


/* ######################################################### */



export class Block {
    public blockHeight: number;
    public parentBlockHash: BlockHash;
    public miner: AccountAddress = emptyAddress;
    public nonce: bigint = 42n;
    public hash: BlockHash | null = null;
    public timestamp: number | null = null;
    public transactions: TransactionHash[] = [];
    //public receipts: TransactionReceipt[] = [];
    private blockchainMetadata: BlockchainMetadata | null = null;
    private updatedAccounts: Accounts | null = null;
    //public updatedAccounts: Accounts = {}; // TODO: stocker les accounts modifiés (avec le diff) dans le contenu de chaque block respectif (si on veut retourner au block n-1)
    //public lastBlockchainState: BlockchainMetadata | null = null; // TODO: permet de recuperer un etat precedent de la blockchain (si on veut retourner au block n-1)


    constructor(blockHeight: number, parentBlockHash: BlockHash) {
        this.blockHeight = blockHeight;
        this.parentBlockHash = parentBlockHash;
    }


    static from(blockData: BlockData) {
        const block = new Block(blockData.blockHeight, blockData.parentBlockHash);
        Object.assign(block, blockData);

        //block.transactions = blockData.transactions.map(txData => Transaction.from(txData));

        return block;
    }


    async getTransactions(blockchain: Blockchain): Promise<Transaction[]> {
        const transactions: Transaction[] = [];

        for (const txHash of this.transactions) {
            const transaction: Transaction | null = blockchain.getTransaction(txHash);
            asserts(transaction, `[${now()}][Block.getTransactions] transaction not found`);

            transactions.push(transaction);
        }

        return transactions;
    }


    async executeTransaction(blockchain: Blockchain, block: Block, tx: Transaction): Promise<TransactionReceipt> {
        asserts(tx.hash, `missing transaction hash`);

        const txReceipt: TransactionReceipt = await executeTransaction(blockchain, block, tx)
            .catch((err: any) => {
                // revert transaction
                console.warn(`[${now()}][Block.executeTransaction] TX REVERTED: ${err.message}`);
                throw err;
            });

        return txReceipt;
    }


    toData(): BlockData {
        const block: Block = this;

        const blockData: BlockData = {
            blockHeight: block.blockHeight,
            parentBlockHash: block.parentBlockHash,
            miner: block.miner,
            hash: block.hash,
            timestamp: block.timestamp ?? 0,
            transactions: block.transactions, //.map(tx => tx.toData()),
            //receipts: block.transactions.map((txHash, idx) => blockchain.), // TransactionReceipt.toData(txHash)
            nonce: block.nonce,
            _metadata: {
                blockchainMetadata: block.blockchainMetadata,
                updatedAccounts: block.updatedAccounts,
            },
        };

        return blockData;
    }


    toJSON(): string {
        const blockData = this.toData();

        return JSON.stringify(blockData, jsonReplacer, 4);
    }


    static formatForRpc(blockchain: Blockchain, block: Block, showTransactionsDetails?: boolean): BlockRpc {

        const transactions: TransactionHash[] | TransactionRpc[] = showTransactionsDetails
            ? block.transactions
            : block.transactions.map(txHash => {
                    const tx = blockchain.getTransaction(txHash) ?? new Transaction(emptyAddress);
                    return Transaction.formatForRpc(tx);
                });

        const blockRpc: BlockRpc = {
            baseFeePerGas: '0x01',
            difficulty: '0x02',
            extraData: '0x03',
            gasLimit: '0xf4240', // 1_000_000
            gasUsed: '0x04', // TODO: a gérer dans la VM
            hash: block.hash,
            logsBloom: '0x05',
            miner: block.miner,
            mixHash: '0x06',
            nonce: toHex(block.nonce),
            number: toHex(block.blockHeight),
            parentHash: block.parentBlockHash,
            receiptsRoot: null, //'0x',
            sha3Uncles: '0x07',
            size: '0x08',
            stateRoot: null, //'0x0',
            prevRandao: null, //'0x0',
            timestamp: toHex(block.timestamp ?? 0),
            totalDifficulty: '0x09',
            transactions,
            transactionsRoot: '0x0a',
            uncles: [],
        };

        return blockRpc;
    }


    getTransaction(blockchain: Blockchain, txHash: TransactionHash) {
        return blockchain.getTransaction(txHash);
    }


    getTransactionReceipt(blockchain: Blockchain, txHash: TransactionHash) {
        return blockchain.getTransactionReceipt(txHash);
    }


    computeHash(): BlockHash {
        const blockFormatted: BlockData = this.toData();

        delete blockFormatted._metadata;

        const blockHash: BlockHash = computeHash(blockFormatted);

        if (true && fs.existsSync('/tmp/blockchain-js-debug')) {
            // DEBUG
            const debugFile = `/tmp/blockchain-js-debug/block-${this.blockHeight}.${Date.now()}.json`;
            fs.writeFileSync(debugFile, JSON.stringify(blockFormatted, jsonReplacer, 4));
        }

        return blockHash;
    }


    setBlockchainMetadata(metadata: BlockchainMetadata) {
        this.blockchainMetadata = metadata;
    }


    setUpdatedAccounts(accounts: Accounts) {
        this.updatedAccounts = accounts;
    }
}

