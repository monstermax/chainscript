// cli.ts

import fs from 'fs';

import { fullcoin, METADATA_FILE, p2pPort, rpcPort, STATE_DIR } from './config';
import { asserts } from "./utils";
import { Blockchain } from "./blockchain";
import { Transaction } from "./transaction";
import { rpcListen } from './rpc';
import { P2PNode } from './p2p';

import type { AccountAddress, CodeAbi } from './types/account.types';
import { BlocksMiner } from './miner';


/* ######################################################### */

/*

ts-node cli.ts --init
ts-node cli.ts --test --mine
ts-node cli.ts --listen --mine

ts-node cli.ts --test --tx-transfer
ts-node cli.ts --test --tx-create-contract-1
ts-node cli.ts --test --tx-exec-contract-1
ts-node cli.ts --test --tx-create-token-1
ts-node cli.ts --test --tx-exec-token-1

ts-node cli.ts --dump-accounts --dump-memories --dump-blocks

*/

/* ######################################################### */


async function main() {

    if (process.argv.includes('--init')) {
        // Initialize a new Blockchain

        if (fs.existsSync(STATE_DIR)) {

            if (fs.existsSync(METADATA_FILE) && ! process.argv.includes('--force')) {
                console.warn(`Cannot init a not-empty blockchain. Use --force option to force`);
                return;
            }

            fs.rmSync(STATE_DIR, { recursive: true });
        }

        fs.mkdirSync(STATE_DIR);
    }


    // Load the Blockchain
    const blockchain = new Blockchain;


    if (process.argv.includes('--init')) {
        // Create the Genesis Block
        const { block, receipt } = await blockchain.createGenesisBlock();

        console.log('block:', block);
        console.log('receipt:', receipt);
    }


    if (process.argv.includes('--test')) {
        await testsTransactions(blockchain);
    }


    console.log('\n', '#'.repeat(80), '\n');



    if (process.argv.includes('--dump-blocks')) {
        console.log('blocks: ', blockchain.stateManager.dumpBlocks());
    }

    if (process.argv.includes('--dump-memories')) {
        console.log('memories: ', blockchain.stateManager.dumpAccountsMemories());
    }

    if (process.argv.includes('--dump-accounts')) {
        console.log('accounts: ', blockchain.stateManager.dumpAccountsBalances(true));
    }


    if (process.argv.includes('--listen')) {
        // Wait for transactions...

        // Load the P2P
        const p2pNode = new P2PNode(blockchain, p2pPort);
        p2pNode.startServer();


        // Load miner
        if (process.argv.includes('--mine')) {
            const minerAddress: AccountAddress = '0xee5392913a7930c233Aa711263f715f616114e9B'; // addressTest1

            const miner = new BlocksMiner(blockchain, minerAddress);
            miner.start();
        }

        // Load RPC
        await rpcListen(blockchain, rpcPort);
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


    if (process.argv.includes('--mine')) {
        const minerAddress: AccountAddress = '0xee5392913a7930c233Aa711263f715f616114e9B'; // addressTest1

        const { block, receipt } = await blockchain.createBlock(minerAddress);

        console.log('block:', block)
        console.log('receipt:', receipt)
    }

    if (process.argv.includes('--tx-transfer')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;
        const txAmount = 10n * fullcoin;

        const tx = new Transaction(txExecutorAddress, txAmount)
            .transfer(addressContract1, txAmount); // TRANSFER AMOUNT

        // 2. Add transaction to the block
        blockchain.mempool.addTransaction(tx);
    }

    if (process.argv.includes('--tx-create-contract-1')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;

        const code = loadScriptCode('ContractTest1');
        const abi: CodeAbi = [ { class: 'ContractTest1', methods: { test_vm_1: {} } } ];

        const tx = new Transaction(txExecutorAddress)
            .create(abi, code); // CREATE CONTRACT

        // 2. Add transaction to the block
        blockchain.mempool.addTransaction(tx);
    }

    if (process.argv.includes('--tx-exec-contract-1')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;
        const txAmount = 10n * fullcoin;

        const tx = new Transaction(txExecutorAddress, txAmount)
            .transfer(addressContract1, txAmount) // TRANSFER AMOUNT
            .call(addressContract1, 'ContractTest1', 'test_vm_1'); // CALL CONTRACT

        // 2. Add transaction to the block
        blockchain.mempool.addTransaction(tx);
    }

    if (process.argv.includes('--tx-create-contract-2')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;

        const code = loadScriptCode('ContractTest2');
        const abi: CodeAbi = [ { class: 'ContractTest2', methods: { test_vm_2_a: {}, test_vm_2_b: {} } } ];

        const tx = new Transaction(txExecutorAddress)
            .create(abi, code); // CREATE TOKEN

        // 2. Add transaction to the block
        blockchain.mempool.addTransaction(tx);
    }

    if (process.argv.includes('--tx-create-token-1')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;

        const code = loadScriptCode('ContractToken1');
        const abi: CodeAbi = [ { class: 'ContractToken1', methods: { transfer: {}, balanceOf: {} } } ];

        const tx = new Transaction(txExecutorAddress)
            .create(abi, code); // CREATE TOKEN

        // 2. Add transaction to the block
        blockchain.mempool.addTransaction(tx);
    }

    if (process.argv.includes('--tx-exec-token-1')) {
        // 1. Create a transaction
        const txExecutorAddress = addressTest1;
        const txAmount = 0n * fullcoin;
        const fulltoken = BigInt(10 ** 9); // because this token has 9 decimals

        const tx = new Transaction(txExecutorAddress, txAmount)
            .call(addressToken1, 'ContractToken1', 'transfer', ['0x0000000000000000000000000000000000000020', 600n * fulltoken]); // CALL TOKEN

        // 2. Add transaction to the block
        blockchain.mempool.addTransaction(tx);
    }

    console.log('mempool:', blockchain.mempool);
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

