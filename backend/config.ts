// config.ts


// Blockchain config
export const symbol = "DEV";
export const decimals = 18; // ne pas changer pour conserver la compatibilité Metamask (EVM)
export const fullcoin = BigInt(10 ** decimals);
export const blockReward = 50n * fullcoin;
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
export const blockDelayMin =  3_000; // pas plus d'un bloc toutes les N secondes
export const blockDelayMax = 60_000; // au moins un bloc toutes les N secondes
export const blockMinTransactions = 1; // au moins N transactions par block
export const blockMaxTransactions = 10; // pas plus de N transactions par block


// Genesis config
export const genesisTimestamp = 1739232518150;



// DEV Wallet
export const devAddress = "0xee5392913a7930c233Aa711263f715f616114e9B";
export const devPrivateKey = "f55ccf8acbef226806fcccf268c1dc6d7365c42009c963a4e9565debc3dba475";


export const defaultStateDir = `/home/${process.env.USER}/.blockchain-js`;

export const MAX_MEMORY_BLOCKS = 1000; // Nb maximum de blocks à conserver en mémoire dans le cachee LRU
export const MAX_MEMORY_ACCOUNTS = 5_000; // Nb maximum de comptes à conserver en mémoire dans le cachee LRU
//export const MAX_MEMORY_TRANSACTIONS = 10_000; // Nb maximum de transactions à conserver en mémoire dans le cachee LRU => à implémenter

