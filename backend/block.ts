// block.ts

import fs from 'fs';

import { asserts, computeHash, jsonReplacer, now, toHex } from './utils';
import { Blockchain } from './blockchain';
import { Transaction } from './transaction';
import { executeTransaction } from './execution';

import type { BlockData, BlockHash, BlockRpc } from './types/block.types';
import type { AccountAddress } from './types/account.types';
import type { TransactionHash, TransactionReceipt } from './types/transaction.types';


/* ######################################################### */



export class Block {
    public blockHeight: number;
    public parentBlockHash: BlockHash;
    public miner: AccountAddress = '0x';
    public nonce: bigint = 0n;
    public hash: BlockHash | null = null;
    public timestamp: number | null = null;
    public transactions: Transaction[] = [];
    public receipts: TransactionReceipt[] = [];
    //public updatedAccounts: Accounts = {}; // TODO: stocker les accounts modifiés (avec le diff) dans le contenu de chaque block respectif (si on veut retourner au block n-1)
    //public lastBlockchainState: BlockchainMetadata | null = null; // TODO: permet de recuperer un etat precedent de la blockchain (si on veut retourner au block n-1)


    constructor(blockHeight: number, parentBlockHash: BlockHash) {
        this.blockHeight = blockHeight;
        this.parentBlockHash = parentBlockHash;
    }


    static from(blockData: BlockData) {
        const block = new Block(blockData.blockHeight, blockData.parentBlockHash);
        Object.assign(block, blockData);

        block.transactions = blockData.transactions.map(txData => Transaction.from(txData));

        return block;
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
            transactions: block.transactions.map(tx => tx.toData()),
            receipts: block.transactions.map((tx, idx) => Transaction.toReceiptData(tx, block.receipts[idx])),
            nonce: block.nonce,
        };

        return blockData;
    }


    toJSON(): string {
        const blockData = this.toData();

        return JSON.stringify(blockData, jsonReplacer, 4);
    }


    static formatForRpc(block: Block, showTransactionsDetails?: boolean): BlockRpc {
        const blockRpc: BlockRpc = {
            baseFeePerGas: '0x00',
            difficulty: '0x00',
            extraData: '0x',
            gasLimit: '0xf4240', // 1_000_000
            gasUsed: '0x01', // TODO: a gérer dans la VM
            hash: block.hash,
            logsBloom: '0x',
            miner: block.miner,
            mixHash: '0x',
            nonce: toHex(block.nonce),
            number: toHex(block.blockHeight),
            parentHash: block.parentBlockHash,
            receiptsRoot: '0x',
            sha3Uncles: '0x',
            size: '0x00',
            stateRoot: '0x',
            timestamp: toHex(block.timestamp ?? 0),
            totalDifficulty: '0x00',
            transactions: block.transactions.map(tx => showTransactionsDetails ? Transaction.formatForRpc(block, tx) : tx.hash),
            transactionsRoot: '0x',
            uncles: [],
        };

        return blockRpc;
    }


    getTransaction(txHash: TransactionHash) {
        const transactionIndex = this.transactions.findIndex(_tx => _tx.hash === txHash);
        return this.transactions[transactionIndex];
    }


    getTransactionReceipt(txHash: TransactionHash) {
        const transactionIndex = this.transactions.findIndex(_tx => _tx.hash === txHash);
        return this.receipts[transactionIndex];
    }


    computeHash(): BlockHash {
        const blockFormatted: BlockData = this.toData();
        const blockHash: BlockHash = computeHash(blockFormatted);

        if (true && fs.existsSync('/tmp/blockchain-js-debug')) {
            // DEBUG
            const debugFile = `/tmp/blockchain-js-debug/block-${this.blockHeight}.${Date.now()}.json`;
            fs.writeFileSync(debugFile, JSON.stringify(blockFormatted, jsonReplacer, 4));
        }

        return blockHash;
    }
}

