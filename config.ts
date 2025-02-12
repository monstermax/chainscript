// config.ts


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

export const initialPeers = [
    "192.168.1.100:6001",
    "192.168.1.113:6001",
    "127.0.0.1:6002",
    "127.0.0.1:6003",
    //"127.0.0.1:6004",
    //"127.0.0.1:6005",
];



// Mining config
export const blockDelayMin = 10_000; // pas plus d'un bloc toutes les N secondes
export const blockDelayMax = 60_000; // au moins un bloc toutes les N secondes
export const blockMinTransactions = 0; // au moins N transactions par block
export const blockMaxTransactions = 10; // pas plus de N transactions par block

// Genesis config
export const genesisTimestamp = 1739232518150;



// DEV Wallet
export const devAddress = "0xee5392913a7930c233Aa711263f715f616114e9B";
export const devPrivateKey = "f55ccf8acbef226806fcccf268c1dc6d7365c42009c963a4e9565debc3dba475";


export const defaultStateDir = `/home/${process.env.USER}/.blockchain-js`;
