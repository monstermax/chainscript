// transaction.types.ts

import type { HexNumber } from "./types";
import type { AccountAddress, CodeAbi } from "./account.types";
import type { BlockHash } from "./block.types";
import type { Transaction } from "@backend/blockchain/transaction";
import { TransactionReceipt } from "@backend/blockchain/receipt";


/* ######################################################### */


export type TransactionHash = HexNumber;

export type TransactionsIndex = Record<TransactionHash, number>; // blockHeight

export type Transactions = { [txHash: TransactionHash]: Transaction };


export type TransactionData = {
    blockHash?: BlockHash | null; // null when it's pending
    blockHeight?: number | null; // null when it's pending
    from: AccountAddress;
    nonce?: bigint;
    value: bigint;
    instructions: TransactionInstruction[];
    hash?: TransactionHash | null;
    transactionIndex?: number | null; // null when it's pending
    //callData?: string | null;
    //to: AccountAddress;
    //gasPrice: bigint;
    //gasLimit: bigint;
}


// Doc: https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyhash/
export type TransactionRpc = {
    accessList: any[];
    blockHash: BlockHash | null; // null when it's pending
    blockNumber: HexNumber | null; // null when it's pending
    chainId: HexNumber;
    from: AccountAddress;
    gas: HexNumber;
    gasPrice: HexNumber;
    hash: TransactionHash | null;
    input: HexNumber;
    maxFeePerGas?: HexNumber;
    maxPriorityFeePerGas: HexNumber;
    nonce: HexNumber;
    r: HexNumber | null;
    s: HexNumber;
    to: AccountAddress | null;
    transactionIndex: HexNumber | null; // null when it's pending
    type: HexNumber;
    v: HexNumber;
    value: HexNumber;
    yParity?: HexNumber;
}




export type TransactionsReceipts = { [txHash: TransactionHash]: TransactionReceipt };

//export type TransactionReceipt = TransactionReceiptData;

export type TransactionReceiptData = {
    transactionHash: TransactionHash;
    transactionIndex: number;
    success: boolean;
    fees: bigint;
    blockHeight: number;
    blockHash: BlockHash;
    contractAddress: AccountAddress | null;
    logs: TransactionLog[];
}


export type TransactionReceiptRpc = {
    blockHash: BlockHash;
    blockNumber: HexNumber;
    contractAddress: AccountAddress | null;
    cumulativeGasUsed: HexNumber;
    effectiveGasPrice: HexNumber;
    from: AccountAddress;
    gasUsed: HexNumber;
    logs: TransactionReceiptLogRpc[];
    logsBloom: HexNumber;
    status: HexNumber;
    to: AccountAddress | null;
    transactionHash: HexNumber;
    transactionIndex: HexNumber;
    type: HexNumber;
};



export type TransactionLog = any; // TODO


export type TransactionReceiptLogRpc = {
    address: AccountAddress;
    blockHash: BlockHash;
    blockNumber: HexNumber;
    data: HexNumber;
    logIndex: HexNumber;
    removed: boolean;
    topics: HexNumber[];
    transactionHash: TransactionHash;
    transactionIndex: HexNumber;
};




export type TransactionInstruction = TransactionInstructionTransfer | TransactionInstructionCreate | TransactionInstructionExecute | TransactionInstructionMint;


export type TransactionInstructionTransfer = {
    type: 'transfer',
    recipient: AccountAddress,
    amount: bigint,
}

export type TransactionInstructionMint = {
    type: 'mint',
    address: AccountAddress,
    amount: bigint,
}


export type TransactionInstructionCreate = {
    type: 'create',
    contractAddress: AccountAddress,
    contractClass: string,
    code: string,
    amount?: bigint,
    contructorArgs: string[],
}


export type TransactionInstructionExecute = {
    type: 'execute',
    contractAddress: AccountAddress,
    className: string,
    methodName: string,
    methodArgs: string[],
    amount?: bigint,
}

