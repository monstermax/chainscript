// types.ts

import { Account } from "./account";
import { Block } from "./blockchain";
import { Transaction } from "./transaction";

/* ######################################################### */


export type BlockchainMetadata = {
    totalAccounts: number;
    totalBlocks: number;
    blocksHash: HexNumber;
    accountsHash: HexNumber;
    lastBlockHash: HexNumber;
    totalSupply: bigint;
};


export type Accounts =  { [address: string]: Account };
export type Blocks =  { [blockHeight: number]: Block };


export type CodeAbi = {
    contract: string, // class
    method: string,
    inputs?: any[],
    output?: any,
    public?: boolean,
    payable?: boolean,
}[];


export type ContractMemory = Record<string, any>;


export type HexNumber = `0x${string}`;

export type BlockHash = HexNumber;
export type TransactionHash = HexNumber;
export type AccountAddress = `0x${string}`;
export type AccountHash = HexNumber;


export type BlocksIndex = BlockHash[];

export type AccountsIndex = Record<AccountAddress, AccountHash>;


export type BlockData = {
    blockHeight: number;
    parentBlockHash: BlockHash;
    miner: AccountAddress;
    hash: BlockHash | undefined;
    transactions: TransactionData[];
    nonce: bigint,
}


export type TransactionData = {
    emitter: AccountAddress;
    signature: TransactionHash | null;
    amount: bigint;
    instructions: TransactionInstruction[];
}


export type AccountData = {
    address: AccountAddress;
    balance: bigint;
    abi: CodeAbi | null;
    code: string | null;
    memory: ContractMemory | null;
    transactionsCount: number;
    hash: AccountHash | null;
}


export type BlockReceipt = {
    hash: BlockHash,
    reward: bigint,
}


export type TransactionReceipt = {
    signature: TransactionHash,
    amount: bigint,
    fees: bigint,
    //logs: any[], // TODO
}


export type TransactionInstruction = TransactionInstructionTransfer | TransactionInstructionCreate | TransactionInstructionCall;


export type TransactionInstructionTransfer = {
    type: 'transfer',
    recipient: AccountAddress,
    amount: bigint,
}


export type TransactionInstructionCreate = {
    type: 'create',
    scriptAddress: AccountAddress,
    abi: CodeAbi,
    code: string,
}


export type TransactionInstructionCall = {
    type: 'call',
    scriptAddress: AccountAddress,
    scriptClass: string,
    scriptMethod: string,
    scriptArgs: any[],
}

