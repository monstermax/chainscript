// test_cli.ts

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
ts-node test_cli.ts --init [--force]        # initiialize the blockchain (including genesis block)

# Run
ts-node test_cli.ts --listen [--mine]       # listen for rpc & p2p transactions + mine new blocks

# Monitoring
ts-node test_cli.ts --dump-accounts --dump-memories --dump-blocks

# Options
ts-node test_cli.ts --dir ~/.blockchain-js [...]
ts-node test_cli.ts --rpc 8545 [...]
ts-node test_cli.ts --p2p 6001 [...]

*/

/* ######################################################### */

const minerAddress: AccountAddress = '0xee5392913a7930c233Aa711263f715f616114e9B'; // addressTest1

/* ######################################################### */


async function main() {
    const stateDir: string = getOpt('--dir') || defaultStateDir;
    ensureDirectory(stateDir);

    const rpcPort: number = Number(getOpt('--rpc')) || defaultRpcPort; // -1 to disable rpc
    const p2pPort: number = Number(getOpt('--p2p')) || defaultP2pPort; // -1 to disable p2p


    if (! lockDb(stateDir)) {
        return;
    }

    handleErrors(() => unlockDb(stateDir));



    if (hasOpt('--init')) {
        // Initialize a new Blockchain

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


    // Load the Blockchain
    const blockchain = new Blockchain(stateDir);


    if (hasOpt('--init')) {
        // Create the Genesis Block
        const { block, blockReceipt } = await blockchain.createGenesisBlock();

        console.log(`[${now()}][cli][main] block:`, block);
        console.log(`[${now()}][cli][main] blockReceipt:`, blockReceipt);
    }


    if (hasOpt('--test')) {
        await testsTransactions(blockchain);
    }


    console.log('\n', '#'.repeat(80), '\n');



    if (hasOpt('--dump-blocks')) {
        console.log(`[${now()}][cli][main] blocks: `, blockchain.stateManager.dumpBlocks());
    }

    if (hasOpt('--dump-memories')) {
        console.log(`[${now()}][cli][main] memories: `, blockchain.stateManager.dumpAccountsMemories());
    }

    if (hasOpt('--dump-accounts')) {
        console.log(`[${now()}][cli][main] accounts: `, blockchain.stateManager.dumpAccountsBalances(true));
    }


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



async function testsTransactions(blockchain: Blockchain) {

    const addressTest1: AccountAddress = '0xee5392913a7930c233Aa711263f715f616114e9B';
    const addressTest2: AccountAddress = '0x0000000000000000000000000000000000000020';
    const addressTest3: AccountAddress = '0x0000000000000000000000000000000000000030';
    const addressTest4: AccountAddress = '0x0000000000000000000000000000000000000040';

    const addressContract1: AccountAddress = '0xdc0c7f994d58af4e7346ebe8fb0917af55d6ca45';
    const addressContract2: AccountAddress = '0x84a32d0b52ff252229b49da06d541dce857fb480';
    const addressToken1: AccountAddress = '0xc9e4facb4b3c1248cbf71203b568ab617453981e';


    if (hasOpt('--tx-transfer')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;
        const txAmount = 10n * fullcoin;

        const tx = new Transaction(txExecutorAddress, txAmount)
            .transfer(addressContract1, txAmount); // TRANSFER AMOUNT

        // 2. Add transaction to the mempool
        blockchain.mempool.addTransaction(tx);
    }

    if (hasOpt('--tx-create-contract-1')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;

        const code = loadScriptCode('ContractTest1');
        const abi: CodeAbi = [ { class: 'ContractTest1', methods: { test_vm_1: {} }, attributes: {} } ];

        const tx = new Transaction(txExecutorAddress)
            .create(code, 'ContractTest1'); // CREATE CONTRACT

        // 2. Add transaction to the mempool
        blockchain.mempool.addTransaction(tx);
    }

    if (hasOpt('--tx-exec-contract-1')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;
        const txAmount = 10n * fullcoin;

        const tx = new Transaction(txExecutorAddress, txAmount)
            .transfer(addressContract1, txAmount) // TRANSFER AMOUNT
            .execute(addressContract1, 'ContractTest1', 'test_vm_1'); // CALL CONTRACT

        // 2. Add transaction to the mempool
        blockchain.mempool.addTransaction(tx);
    }

    if (hasOpt('--tx-create-contract-2')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;

        const code = loadScriptCode('ContractTest2');
        const abi: CodeAbi = [ { class: 'ContractTest2', methods: { test_vm_2_a: {}, test_vm_2_b: {} }, attributes: {} } ];

        const tx = new Transaction(txExecutorAddress)
            .create(code, 'ContractTest1'); // CREATE TOKEN

        // 2. Add transaction to the mempool
        blockchain.mempool.addTransaction(tx);
    }

    if (hasOpt('--tx-create-token-1')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;

        const code = loadScriptCode('ContractToken1');
        const abi: CodeAbi = [ { class: 'ContractToken1', methods: { transfer: {}, balanceOf: {} }, attributes: {} } ];

        const tx = new Transaction(txExecutorAddress)
            .create(code, 'ContractTest1'); // CREATE TOKEN

        // 2. Add transaction to the mempool
        blockchain.mempool.addTransaction(tx);
    }

    if (hasOpt('--tx-exec-token-1')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;
        const txAmount = 0n * fullcoin;
        const fulltoken = BigInt(10 ** 9); // because this token has 9 decimals

        const tx = new Transaction(txExecutorAddress, txAmount)
            .execute(addressToken1, 'ContractToken1', 'transfer', ['0x0000000000000000000000000000000000000020', 600n * fulltoken]); // CALL TOKEN

        // 2. Add transaction to the mempool
        blockchain.mempool.addTransaction(tx);
    }

    if (hasOpt('--mine')) {
        const minerAddress: AccountAddress = '0xee5392913a7930c233Aa711263f715f616114e9B'; // addressTest1

        const miningResult = await blockchain.createNewBlock(minerAddress);

        if (miningResult) {
            const { block, blockReceipt } = miningResult;

            console.log(`[${now()}][cli][main] block:`, block)
            console.log(`[${now()}][cli][main] blockReceipt:`, blockReceipt)
        }
    }

    console.log(`[${now()}][cli][main] mempool:`, blockchain.mempool.toJSON());
}


function loadScriptCode(scriptName: string) {
    // Load source code
    const execScriptFile = `${__dirname}/example/scripts/${scriptName}.js`;
    asserts(fs.existsSync(execScriptFile), "[loadScriptCode] script file not found");

    const execScriptCode = fs.readFileSync(execScriptFile).toString();
    return execScriptCode;
}


/* ######################################################### */


main();

