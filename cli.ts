// cli.ts

import fs from 'fs';

import { Block, Blockchain, GenesisBlock } from "./blockchain";
import { Transaction } from "./transaction";
import { asserts } from "./utils";
import { fullcoin, STATE_DIR } from './config';
import { AccountAddress, CodeAbi } from './types';


/* ######################################################### */

/*

ts-node cli.ts --reset
ts-node cli.ts --block
ts-node cli.ts --block --tx-transfer
ts-node cli.ts --block --tx-create-contract-1
ts-node cli.ts --block --tx-exec-contract-1
ts-node cli.ts --block --tx-create-token-1
ts-node cli.ts --block --tx-exec-token-1
*/

/* ######################################################### */


async function main() {

    if (process.argv.includes('--reset')) {
        if (fs.existsSync(STATE_DIR)) {
            fs.rmSync(STATE_DIR, { recursive: true });
        }

        fs.mkdirSync(STATE_DIR);
    }


    // 1. Initialize Blockchain
    const blockchain = new Blockchain;


    if (process.argv.includes('--reset')) {
        const block = new GenesisBlock;
        const blockReceipt = await blockchain.addBlock(block);

        console.log('block:', block);
        console.log('receipt:', blockReceipt);
    }


    if (process.argv.includes('--block')) {

        // Load previous block
        const blockchainHeight = blockchain.blockHeight;
        const parentBlock = await blockchain.getBlock(blockchainHeight);
        asserts(parentBlock, 'parent block not found');
        asserts(parentBlock.hash, 'empty parent block hash');

        // Create new (empty) block
        const block = new Block(parentBlock.blockHeight + 1, parentBlock.hash);
        block.miner = '0x0000000000000000000000000000000000000010';


        if (process.argv.includes('--tx-transfer')) {
            // 1. Create a transaction
            const txExecutorAddress = '0x0000000000000000000000000000000000000010';
            const txAmount = 10n * fullcoin;

            const tx = new Transaction(txExecutorAddress, txAmount)
                .transfer('0xcontract_test_1', txAmount);

            // 2. Add transaction to the block
            block.addTransaction(tx);
        }

        if (process.argv.includes('--tx-create-contract-1')) {
            // 1. Create a transaction
            const txExecutorAddress = '0x0000000000000000000000000000000000000010';

            const code = loadScriptCode('0xcontract_test_1');
            const abi: CodeAbi = [];

            const tx = new Transaction(txExecutorAddress)
                .create('0xcontract_test_1', abi, code);

            // 2. Add transaction to the block
            block.addTransaction(tx);
        }

        if (process.argv.includes('--tx-exec-contract-1')) {
            // 1. Create a transaction
            const txExecutorAddress = '0x0000000000000000000000000000000000000010';
            const txAmount = 10n * fullcoin;

            const tx = new Transaction(txExecutorAddress, txAmount)
                .transfer('0xcontract_test_1', txAmount)
                .call('0xcontract_test_1', 'ContractTest1', 'test_vm_1');

            // 2. Add transaction to the block
            block.addTransaction(tx);
        }

        if (process.argv.includes('--tx-create-token-1')) {
            // 1. Create a transaction
            const txExecutorAddress = '0x0000000000000000000000000000000000000010';

            const code = loadScriptCode('0xcontract_token_1');
            const abi: CodeAbi = [];

            const tx = new Transaction(txExecutorAddress)
                .create('0xcontract_token_1', abi, code);

            // 2. Add transaction to the block
            block.addTransaction(tx);
        }

        if (process.argv.includes('--tx-exec-token-1')) {
            // 1. Create a transaction
            const txExecutorAddress = '0x0000000000000000000000000000000000000010';
            const txAmount = 0n * fullcoin;

            const tx = new Transaction(txExecutorAddress, txAmount)
                .call('0xcontract_token_1', 'ContractToken1', 'transfer', ['0xhuman_2', 600n * BigInt(10 ** 9)]);

            // 2. Add transaction to the block
            block.addTransaction(tx);
        }


        // Add block to the blockchain
        const block0Receipt = await blockchain.addBlock(block);
        console.log('block:', block);
        console.log('receipt:', block0Receipt);
    }


    console.log('\n', '#'.repeat(80), '\n');
    //console.log('txSignature:', signature);

    console.log('memories: ', blockchain.memoryState.dumpAccountsMemories())
    //console.log('accounts: ', manager.dumpAccountsBalances())
    console.log('accounts: ', blockchain.memoryState.dumpAccountsBalances(true))

}



function loadScriptCode(scriptAddress: AccountAddress) {
    // Load source code
    const execScriptFile = `${__dirname}/example/scripts/${scriptAddress}.js`;
    asserts(fs.existsSync(execScriptFile), "[loadScriptCode] script file not found");

    const execScriptCode = fs.readFileSync(execScriptFile).toString();
    return execScriptCode;
}


/* ######################################################### */


main();

