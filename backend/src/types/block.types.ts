// block.types.ts

import { Block } from "@backend/blockchain/block";

import type { HexNumber } from "./types";
import type { AccountAddress, Accounts } from "./account.types";
import type { TransactionData, TransactionHash } from "./transaction.types";
import type { BlockchainMetadata } from "./blockchain.types";
import { TransactionReceipt } from "@backend/blockchain/receipt";


/* ######################################################### */

export type BlockParameter = HexNumber | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized'; // spec => https://ethereum.org/en/developers/docs/apis/json-rpc/#default-block

export type BlockHash = HexNumber;

export type Blocks = { [blockHeight: number]: Block };

export type BlocksIndex = BlockHash[];


export type BlockData = {
    blockHeight: number;
    parentBlockHash: BlockHash;
    miner: AccountAddress;
    hash: BlockHash | null;
    timestamp: number;
    transactions: TransactionHash[];
    //receipts: TransactionReceipt[];
    //updatedAccounts: Accounts; // TODO: permet de recuperer un etat precedent des accounts
    //lastBlockchainState: BlockchainMetadata; // TODO: permet de recuperer un etat precedent de la blockchain (si on veut retourner au block n-1)
    nonce: bigint,
    _metadata?: {
        blockchainMetadata: BlockchainMetadata | null;
        updatedAccounts: Accounts | null;
    },
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
    receiptsRoot: string | null;
    sha3Uncles: string;
    size: string;
    stateRoot: string | null;
    prevRandao: string | null;
    timestamp: string;
    totalDifficulty: string;
    transactions: any[]; // Peut contenir des transactions, définir précisément si besoin
    transactionsRoot: string;
    uncles: string[];
}


export type BlockReceipt = {
    hash: BlockHash,
    transactionsReceipts: TransactionReceipt[],
};
