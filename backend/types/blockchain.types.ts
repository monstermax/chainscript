// blockchain.types.ts

import type { HexNumber } from "./types";


/* ######################################################### */


export type BlockchainMetadata = {
    totalAccounts: number;
    totalBlocks: number;
    totalTransactions: number;
    blocksHash: HexNumber;
    transactionsHash: HexNumber;
    accountsHash: HexNumber;
    lastBlockHash: HexNumber;
    totalSupply: bigint;
};

