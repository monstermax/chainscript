// config.ts

import path from 'path';



// Blockchain config

/** Nom de la Blockchain */
export const chainName = "ChainScript";

/** Symbole monétaire de la monnaie native de la Blockchain */
export const symbol = "DEV";

/** Nombre de decimals de la monnaie native de la Blockchain */
export const decimals = 18; // ne pas changer pour conserver la compatibilité Metamask (EVM)

/** Nombre de micro unités dans 1 unité entière de la monnaie native (aka bitcoin vs satoshi) */
export const fullcoin = BigInt(10 ** decimals);

/** Récompense pour le minage d'un block */
export const blockReward = 50n * fullcoin;

/** ID de la chaine (à renseigner dans Metamask) */
export const chainId = 9999999999; // disponible dans metamask

export const networkVersion = 1;


// Network config
export const defaultRpcPort = 8545;
export const defaultP2pPort = 6001;

export const initialPeers = [
    "192.168.1.100:6001",
    "192.168.1.113:6001",
    "127.0.0.1:6002",
    "127.0.0.1:6003",
];



// Mining config
export const blockDelayMin = 10_000; // pas plus d'un bloc toutes les N secondes
export const blockDelayMax = 60_000; // au moins un bloc toutes les N secondes
export const blockMinTransactions = 1; // au moins N transactions par block (sauf si blockDelayMax atteint)
export const blockMaxTransactions = 10; // pas plus de N transactions par block


// Genesis config
export const genesisTimestamp = 1739232518150;



// DEV Wallet

/** Wallet de developpement - Addresse */
export const devAddress = "0xee5392913a7930c233Aa711263f715f616114e9B";

/** Wallet de developpement - Clé privée */
export const devPrivateKey = "f55ccf8acbef226806fcccf268c1dc6d7365c42009c963a4e9565debc3dba475";


// Faucet

/** Adresse du compte qui envoie les fonds pour le faucet */
export const faucetAddress = "0xee5392913a7930c233Aa711263f715f616114e9B";




// Blockchain core

/** Repertoire contenant la base de données de la Blockchain (fichiers JSON) */
export const defaultStateDir = `/home/${process.env.USER}/.blockchain-js`;


export const MAX_MEMORY_BLOCKS = 1000; // Nb maximum de blocks à conserver en mémoire dans le cache LRU
export const MAX_MEMORY_ACCOUNTS = 5_000; // Nb maximum de comptes à conserver en mémoire dans le cache LRU
export const MAX_MEMORY_TRANSACTIONS = 15_000; // Nb maximum de transactions à conserver en mémoire dans le cache LRU
export const MAX_MEMORY_RECEIPTS = 10_000; // Nb maximum de receipts à conserver en mémoire dans le cache LRU


export const FULLNODE_DIR = path.resolve(__dirname, "../..");

export const emptyAddress = "0x0000000000000000000000000000000000000000";
