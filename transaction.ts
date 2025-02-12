// transaction.ts

import fs from 'fs';

import { chainId } from './config';
import { asserts, computeHash, jsonReplacer, now, toHex } from './utils';
import { Block } from './block';
import { predictContractAddress } from './account';

import type { AccountAddress } from './types/account.types';
import type { TransactionData, TransactionHash, TransactionInstruction, TransactionInstructionExecute, TransactionInstructionCreate, TransactionInstructionMint, TransactionInstructionTransfer, TransactionReceipt, TransactionReceiptData, TransactionReceiptRpc, TransactionRpc } from './types/transaction.types';
import type { BlockHash } from './types/block.types';


/* ######################################################### */


export class Transaction {
    public from: AccountAddress;
    public hash: TransactionHash | null = null;
    public amount: bigint;
    public instructions: TransactionInstruction[] = [];
    public nonce: bigint | null;
    public blockHeight: number | null = null; // TODO: a deplacer dans les receipts
    public blockHash: BlockHash | null = null; // TODO: a deplacer dans les receipts
    public contractAddress: AccountAddress | null = null;


    constructor(from: AccountAddress, amount: bigint=0n, nonce?: bigint | null) {
        this.from = from;
        this.amount = amount;
        this.nonce = nonce ?? null;
    }

    static from(txData: TransactionData) {
        const tx = new Transaction(txData.from, txData.value, txData.nonce);
        Object.assign(tx, txData);
        return tx;
    }


    public mint(address: AccountAddress, amount: bigint): this {
        const instruction: TransactionInstructionMint = {
            type: 'mint',
            address,
            amount,
        };

        this.instructions.push(instruction);

        return this;
    }


    public transfer(recipient: AccountAddress, amount: bigint): this {
        const instruction: TransactionInstructionTransfer = {
            type: 'transfer',
            recipient,
            amount,
        };

        this.instructions.push(instruction);

        return this;
    }


    public create(code: string, amount=0n): this {
        asserts(this.nonce, `[Transaction][create] missing transaction nonce`);
        const contractAddress: AccountAddress = predictContractAddress(this.from, this.nonce)
        console.log(`[${now()}][Transaction][create] Adresse du contrat à créer :`, contractAddress);

        const instruction: TransactionInstructionCreate = {
            type: 'create',
            contractAddress,
            code,
            value: amount,
        };

        this.instructions.push(instruction);

        return this;
    }


    public execute(contractAddress: AccountAddress, className: string, methodName: string, args: any[]=[]): this {
        const instruction: TransactionInstructionExecute = {
            type: 'execute',
            contractAddress,
            className,
            methodName,
            args,
        };

        this.instructions.push(instruction);

        return this;
    }


    toData(): TransactionData {
        const tx: Transaction = this;

        asserts(typeof tx.nonce === 'bigint', `[Transaction][toData] invalid transaction nonce "${tx.nonce}"`);
        asserts(typeof tx.from === 'string', `[Transaction][toData] invalid transaction emitter type "${tx.from}"`);
        asserts(tx.from.startsWith('0x'), `[Transaction][toData] invalid transaction emitter "${tx.nonce}"`);
        asserts(tx.from === '0x' || tx.from.length === 42, `[Transaction][toData] invalid transaction emitter "${tx.nonce}"`);

        const transactionData: TransactionData = {
            from: tx.from,
            nonce: tx.nonce,
            value: tx.amount,
            instructions: tx.instructions,
            hash: tx.hash,
            //to: tx.to ?? null,
            //gasPrice: 0n,
            //gasLimit: 0n,
        };


        return transactionData;
    }


    toJSON(): string {
        return JSON.stringify(this.toData(), jsonReplacer, 4);
    }


    static formatForRpc(block: Block, tx: Transaction): TransactionRpc {
        // Doc: https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyhash/

        asserts(block.hash, `[Transaction.formatForRpc] missing block hash`);
        asserts(tx.hash, `[Transaction.formatForRpc] missing transaction hash`);

        const to: AccountAddress | null = tx.instructions.filter(instruction => instruction.type === 'transfer').at(0)?.recipient
            ?? tx.instructions.filter(instruction => instruction.type === 'mint').at(0)?.address
            ?? null;
        //asserts(to, `[Transaction.formatForRpc] invalid recipient`);

        const transactionIndex = block.transactions.findIndex(_tx => _tx.hash === tx.hash);
        asserts(transactionIndex > -1, `[Transaction.formatForRpc] transaction not found`);

        const transactionRpc: TransactionRpc = {
            accessList: [],
            blockHash: block.hash,
            blockNumber: toHex(block.blockHeight),
            chainId: toHex(chainId),
            from: tx.from,
            gas: "0x1",
            gasPrice: "0x1",
            hash: tx.hash,
            input: "0x",
            maxFeePerGas: "0x1",
            maxPriorityFeePerGas: "0x1",
            nonce: toHex(tx.nonce ?? 0),
            r: "0x",
            s: "0x",
            to: to,
            transactionIndex: toHex(transactionIndex),
            type: "0x2",
            v: "0x1",
            value: toHex(tx.amount),
            //yParity: "0x1",
        };

        return transactionRpc;
    }


    static toReceiptData(tx: Transaction, receipt: TransactionReceipt): TransactionReceiptData {
        return receipt;
        /*
        const receiptData: TransactionReceiptData = {
            success: receipt.success,
            fees: receipt.fees,
            blockHash: receipt.blockHash,
            blockHeight: receipt.blockHeight,
            contractAddress: receipt.contractAddress,
        };

        return receiptData;
        */
    }


    static formatReceiptForRpc(block: Block, tx: Transaction): TransactionReceiptRpc {

        asserts(block.hash, `[Transaction.formatForRpc] missing block hash`);
        asserts(tx.hash, `[Transaction.formatForRpc] missing transaction hash`);

        const to: AccountAddress | null = tx.instructions.filter(instruction => instruction.type === 'transfer').at(0)?.recipient ?? null;
        //asserts(to, `[Transaction.formatForRpc] invalid recipient`);

        const transactionIndex = block.transactions.findIndex(_tx => _tx.hash === tx.hash);
        asserts(transactionIndex > -1, `[Transaction.formatForRpc] transaction not found`);

        const receiptRpc: TransactionReceiptRpc = {
            blockHash: block.hash,
            blockNumber: toHex(block.blockHeight),
            contractAddress: tx.contractAddress,
            cumulativeGasUsed: "0x",
            effectiveGasPrice: "0x",
            from: tx.from,
            gasUsed: "0x",
            logs: [],
            logsBloom: "0x",
            status: "0x1",
            to: to,
            transactionHash: tx.hash,
            transactionIndex: toHex(transactionIndex),
            type: "0x2"
        };

        return receiptRpc;
    }


    computeHash(): TransactionHash {
        const transactionFormatted: TransactionData = this.toData();
        const transactionHash: TransactionHash = computeHash(transactionFormatted);

        if (true && fs.existsSync('/tmp/blockchain-js-debug')) {
            // DEBUG
            const debugFile = `/tmp/blockchain-js-debug/tx-${Date.now()}-${transactionHash}.json`;
            fs.writeFileSync(debugFile, JSON.stringify(transactionFormatted, jsonReplacer, 4));
        }

        return transactionHash;
    }

}



