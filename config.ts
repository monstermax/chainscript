// config.ts

import path from 'path';


/* ######################################################### */


// Blockchain config
export const symbol = "DEV";
export const decimals = 18;
export const fullcoin = BigInt(10 ** decimals);
export const blockReward = 50n * fullcoin;
export const chainId = 9999999999; // available in metamask
export const networkVersion = 1;


// Network config
export const defaultRpcPort = 8545;
export const defaultP2pPort = 6001;


// Mining config
export const blockDelayMin = 10_000; // pas plus d'un bloc toutes les N secondes
export const blockDelayMax = 60_000; // au moins un bloc toutes les N secondes
export const blockMinTransactions = 0; // au moins N transactions par block
export const blockMaxTransactions = 10; // pas plus de N transactions par block

// Genesis config
export const genesisTimestamp = 1739232518150;



export const defaultStateDir = path.join(__dirname, 'state');
