// cli.ts

import path from 'path';
import fs from 'fs';

import { defaultStateDir, fullcoin, defaultP2pPort, defaultRpcPort } from './config';
import { asserts, ensureDirectory, getOpt, hasOpt, now } from "./helpers/utils";
import { Blockchain } from "./blockchain/blockchain";
import { Transaction } from "./blockchain/transaction";
import { httpListen } from './http/http';
import { P2PNode } from './p2p/p2p';
import { BlocksMiner } from './miner/miner';

import type { AccountAddress, CodeAbi } from './types/account.types';


/* ######################################################### */

/*

# Initialization
ts-node cli.ts --init [--force]        # initiialize the blockchain (including genesis block)

# Run
ts-node cli.ts --listen [--mine]       # listen for rpc & p2p transactions + mine new blocks

# Options
ts-node cli.ts --dir ~/.blockchain-js [...]
ts-node cli.ts --rpc 8545 [...]
ts-node cli.ts --p2p 6001 [...]

*/

/* ######################################################### */

const minerAddress: AccountAddress = '0xee5392913a7930c233Aa711263f715f616114e9B'; // addressTest1

/* ######################################################### */


async function main() {
    const stateDir: string = getOpt('--dir') || defaultStateDir;
    ensureDirectory(stateDir);

    const rpcPort: number = Number(getOpt('--rpc')) || defaultRpcPort; // -1 to disable rpc
    const p2pPort: number = Number(getOpt('--p2p')) || defaultP2pPort; // -1 to disable p2p


    // Vérifie que la database n'est pas locké (evite de lancer 2 instances en meme temps)
    if (! lockDb(stateDir)) {
        return;
    }


    // Gère le unlock de la database en cas d'arret ou de crash
    handleErrors(() => unlockDb(stateDir));



    if (hasOpt('--init')) {
        // Initialize a new Blockchain

        /*
            /!\  !!!  WARNING: ALL DATA WILL BE DELETED  !!!  /!\
        */

        if (fs.existsSync(stateDir)) {
            const metadataFilepath = path.join(stateDir, 'metadata.json');

            if (fs.existsSync(metadataFilepath) && ! hasOpt('--force')) {
                console.warn(`[${now()}][cli][main] Cannot init a not-empty blockchain. Use --force option to ignore`);
                return;
            }

            // Drop the state directory
            fs.rmSync(stateDir, { recursive: true });
        }

        // (re)-create the state directory
        fs.mkdirSync(stateDir);
    }


    // Charge la Blockchain (charge les metadata et indexes) et vérifie l'intégrité
    const blockchain = new Blockchain(stateDir);


    if (hasOpt('--init')) {
        // Créé le block Genesis (block 0)
        const { block, blockReceipt } = await blockchain.createGenesisBlock();

        console.log(`[${now()}][cli][main] block:`, block);
        console.log(`[${now()}][cli][main] blockReceipt:`, blockReceipt);
    }


    // Se met en attente (de nouvelles transactions via rpc ET de nouveaux blocks via p2p) et essaye de miner des blocks
    if (hasOpt('--listen')) {
        // Wait for transactions...

        // Load the P2P => Wait for transactions from P2P
        if (p2pPort > 0) {
            blockchain.p2p = new P2PNode(blockchain, p2pPort);
        }


        // Load RPC => Wait for transactions from RPC
        if (rpcPort > 0) {
            blockchain.server = await httpListen(blockchain, rpcPort);
        }


        // Start local miner
        if (hasOpt('--mine')) {
            blockchain.miner = new BlocksMiner(blockchain, minerAddress);
        }
    }
}


function handleErrors(onClose: () => void) {
    // Gestion propre de CTRL+C
    process.on('SIGINT', () => {
        console.log("\nCTRL+C detected. Stopping watcher...");
        if (onClose) onClose();
        process.exit(0); // Quitter proprement
    });

    // Gestion en cas d'autres erreurs non interceptées
    process.on('uncaughtException', (error) => {
        console.error("Uncaught exception:", error);
        if (onClose) onClose();
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error("Unhandled promise rejection:", reason);
        if (onClose) onClose();
        process.exit(1);
    });

    process.on('SIGTERM', (signal) => {
        console.log("SIGTERM received, shutting down...");
        if (onClose) onClose();
    })

    process.on('beforeExit', (code) => {
        //console.log(`Process beforeExit event with code: ${code}`);
        if (onClose) onClose();
    });

    process.on('exit', (code) => {
        //console.log(`Process exit event with code: ${code}`);
    });
}


function lockDb(stateDir: string): boolean {
    const lockFile = `${stateDir}/state.lock`;

    if (fs.existsSync(lockFile) && ! hasOpt('--force')) {
        console.log(`Warning: lock file exists : ${lockFile} => Use --force option to ignore`);
        return false;
    }

    fs.writeFileSync(lockFile, process.pid.toString());
    return true;
}


function unlockDb(stateDir: string) {
    const lockFile = `${stateDir}/state.lock`;

    if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
    }
}



/* ######################################################### */


main();

