// block.types.ts

import { Block } from "../block";

import type { HexNumber } from "./types";
import type { AccountAddress } from "./account.types";
import type { TransactionData, TransactionReceipt } from "./transaction.types";


/* ######################################################### */


export type BlockHash = HexNumber;

export type Blocks = { [blockHeight: number]: Block };

export type BlocksIndex = BlockHash[];


export type BlockData = {
    blockHeight: number;
    parentBlockHash: BlockHash;
    miner: AccountAddress;
    hash: BlockHash | null;
    timestamp: number;
    transactions: TransactionData[];
    receipts: TransactionReceipt[];
    //updatedAccounts: Accounts; // TODO: permet de recuperer un etat precedent des accounts
    //lastBlockchainState: BlockchainMetadata; // TODO: permet de recuperer un etat precedent de la blockchain (si on veut retourner au block n-1)
    nonce: bigint,
}

export type BlockRpc = {
    baseFeePerGas: string | null;
    difficulty: string;
    extraData: string;
    gasLimit: string;
    gasUsed: string;
    hash: string | null;
    logsBloom: string | null;
    miner: string;
    mixHash: string;
    nonce: string | null;
    number: string | null;
    parentHash: string;
    receiptsRoot: string;
    sha3Uncles: string;
    size: string;
    stateRoot: string;
    timestamp: string;
    totalDifficulty: string;
    transactions: any[]; // Peut contenir des transactions, définir précisément si besoin
    transactionsRoot: string;
    uncles: string[];
}


export type BlockReceipt = {
    hash: BlockHash,
    reward: bigint,
}


