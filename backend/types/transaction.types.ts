// transaction.types.ts

import type { HexNumber } from "./types";
import type { AccountAddress, CodeAbi } from "./account.types";
import type { BlockHash } from "./block.types";


/* ######################################################### */


export type TransactionHash = HexNumber;

export type TransactionsIndex = Record<TransactionHash, number>; // blockHeight


export type TransactionData = {
    from: AccountAddress;
    nonce?: bigint;
    value: bigint;
    instructions: TransactionInstruction[];
    hash?: TransactionHash | null;
    //callData?: string | null;
    //to: AccountAddress;
    //gasPrice: bigint;
    //gasLimit: bigint;
}


// Doc: https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyhash/
export type TransactionRpc = {
    accessList: any[];
    blockHash: BlockHash;
    blockNumber: HexNumber;
    chainId: HexNumber;
    from: AccountAddress;
    gas: HexNumber;
    gasPrice: HexNumber;
    hash: TransactionHash;
    input: HexNumber;
    maxFeePerGas?: HexNumber;
    maxPriorityFeePerGas: HexNumber;
    nonce: HexNumber;
    r: HexNumber;
    s: HexNumber;
    to: AccountAddress | null;
    transactionIndex: HexNumber;
    type: HexNumber;
    v: HexNumber;
    value: HexNumber;
    yParity?: HexNumber;
}




export type TransactionReceipt = TransactionReceiptData;


export type TransactionReceiptData = {
    success: boolean;
    fees: bigint;
    blockHeight: number;
    //blockHash?: BlockHash;
    contractAddress: AccountAddress | null;
    //logs: any[], // TODO
}


export type TransactionReceiptRpc = {
    blockHash: BlockHash;
    blockNumber: HexNumber;
    contractAddress: AccountAddress | null;
    cumulativeGasUsed: HexNumber;
    effectiveGasPrice: HexNumber;
    from: AccountAddress;
    gasUsed: HexNumber;
    logs: Array<{
        address: AccountAddress;
        blockHash: BlockHash;
        blockNumber: HexNumber;
        data: HexNumber;
        logIndex: HexNumber;
        removed: boolean;
        topics: HexNumber[];
        transactionHash: TransactionHash;
        transactionIndex: HexNumber;
    }>;
    logsBloom: HexNumber;
    status: HexNumber;
    to: AccountAddress | null;
    transactionHash: HexNumber;
    transactionIndex: HexNumber;
    type: HexNumber;
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
    value?: bigint,
    contructorArgs: string[],
}


export type TransactionInstructionExecute = {
    type: 'execute',
    contractAddress: AccountAddress,
    className: string,
    methodName: string,
    methodArgs: string[],
}

