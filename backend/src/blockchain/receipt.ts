// receipt.ts

import { asserts, jsonReplacer, toHex } from "@backend/helpers/utils";
import { TransactionHash, TransactionLog, TransactionReceiptData, TransactionReceiptRpc } from "@backend/types/transaction.types";
import { Transaction } from "./transaction";
import { Block } from "./block";
import { AccountAddress } from "@backend/types/account.types";
import { Blockchain } from "./blockchain";
import { BlockHash } from "@backend/types/block.types";



export class TransactionReceipt {
    transactionHash: TransactionHash;
    transactionIndex: number;
    blockHeight: number;
    blockHash: BlockHash;
    success?: boolean;
    fees?: bigint;
    contractAddress?: AccountAddress | null;
    logs: TransactionLog[] = [];


    constructor(blockHeight: number, blockHash: BlockHash, transactionHash: TransactionHash, transactionIndex: number) {
        this.blockHeight = blockHeight;
        this.blockHash = blockHash;
        this.transactionHash = transactionHash;
        this.transactionIndex = transactionIndex;
    }


    static from(receiptData: TransactionReceiptData) {
        const receipt = new TransactionReceipt(receiptData.blockHeight, receiptData.blockHash, receiptData.transactionHash, receiptData.transactionIndex);
        Object.assign(receipt, receiptData);
        return receipt;
    }



    toData(): TransactionReceiptData {
        const receipt: TransactionReceipt = this;

        const receiptData: TransactionReceiptData = {
            transactionHash: receipt.transactionHash,
            transactionIndex: receipt.transactionIndex,
            success: receipt.success ?? false,
            fees: receipt.fees ?? 0n,
            blockHeight: receipt.blockHeight ?? 0,
            blockHash: receipt.blockHash ?? '0x',
            contractAddress: receipt.contractAddress ?? null,
            logs: receipt.logs,
        };

        return receiptData;
    }


    toJSON(): string {
        return JSON.stringify(this.toData(), jsonReplacer, 4);
    }


    static formatForRpc(tx: Transaction, receipt: TransactionReceipt): TransactionReceiptRpc {

        asserts(receipt.blockHash, `[TransactionReceipt.formatForRpc] missing block hash`);
        asserts(receipt.transactionHash, `[TransactionReceipt.formatForRpc] missing transaction hash`);

        const to: AccountAddress | null = tx.instructions.filter(instruction => instruction.type === 'transfer').at(0)?.recipient ?? null;
        //asserts(to, `[TransactionReceipt.formatForRpc] invalid recipient`);

        asserts(receipt.blockHash, `[TransactionReceipt.formatForRpc] missing blockHash`);
        asserts(typeof receipt.transactionIndex === 'number', `[TransactionReceipt.formatForRpc] invalid transactionIndex`);

        const receiptRpc: TransactionReceiptRpc = {
            blockHash: receipt.blockHash,
            blockNumber: toHex(receipt.blockHeight),
            contractAddress: receipt.contractAddress ?? null,
            cumulativeGasUsed: "0x00",
            effectiveGasPrice: "0x02",
            from: tx.from,
            gasUsed: "0x03",
            logs: [],
            logsBloom: "0x04",
            status: receipt?.success ? "0x1" : "0x0",
            to: to,
            transactionHash: receipt.transactionHash,
            transactionIndex: toHex(receipt.transactionIndex),
            type: "0x2"
        };

        return receiptRpc;
    }
}


