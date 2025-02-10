// config.ts

import path from 'path';


/* ######################################################### */


export const STATE_DIR = path.join(__dirname, 'state');
export const BLOCKS_DIR = path.join(STATE_DIR, 'blocks');
export const ACCOUNTS_DIR = path.join(STATE_DIR, 'accounts');

export const symbol = "DEV";
export const decimals = 18;
export const fullcoin = BigInt(10 ** decimals);

export const blockReward = 50n * fullcoin;


export const METADATA_FILE = path.join(STATE_DIR, 'metadata.json');
export const BLOCKS_INDEX_FILE = path.join(STATE_DIR, 'blocksIndex.json');
export const ACCOUNTS_INDEX_FILE = path.join(STATE_DIR, 'accountsIndex.json');
export const TRANSACTIONS_INDEX_FILE = path.join(STATE_DIR, 'transactionsIndex.json');

export const chainId = 9999999999; // available in metamask
export const networkVersion = 1;

export const rpcPort = 8545;
export const p2pPort = 6001;

export const blockDelayMin = 10_000; // pas plus d'un bloc toutes les 10 secondes
export const blockDelayMax = 60_000; // au moins un bloc toutes les 60 secondes

