// transaction.ts

import { MemoryState } from './stateManager';
import { execVm } from './vm';

import { asserts, computeHash } from './utils';

import type { AccountAddress, CodeAbi, TransactionData, TransactionHash, TransactionInstruction, TransactionInstructionCall, TransactionInstructionCreate, TransactionInstructionTransfer, TransactionReceipt } from './types';
import { Blockchain } from './blockchain';


/* ######################################################### */


export class Transaction {
    public emitter: AccountAddress;
    public signature: TransactionHash | null = null;
    public amount: bigint;
    public amountUsed: bigint = 0n;
    public instructions: TransactionInstruction[] = [];

    constructor(emitter: AccountAddress, amount: bigint=0n) {
        this.emitter = emitter;
        this.amount = amount;
    }

    public transfer(recipient: AccountAddress, amount: bigint): this {
        const instruction: TransactionInstructionTransfer = {
            type: 'transfer',
            recipient,
            amount,
        };

        this.instructions.push(instruction);

        return this;
    }


    public create(scriptAddress: AccountAddress, abi: CodeAbi, code: string): this {
        //const account = blockchain.getAccount(scriptAddress);
        //asserts(account.balance === 0n && account.abi === undefined, `account already exists`);

        const instruction: TransactionInstructionCreate = {
            type: 'create',
            scriptAddress,
            abi,
            code,
        };

        this.instructions.push(instruction);

        return this;
    }


    public call(scriptAddress: AccountAddress, scriptClass: string, scriptMethod: string, scriptArgs: any[] = []): this {
        const instruction: TransactionInstructionCall = {
            type: 'call',
            scriptAddress,
            scriptClass,
            scriptMethod,
            scriptArgs,
        };

        this.instructions.push(instruction);

        return this;
    }

    public sign(): this {
        this.signature = '0xmocked_signature';

        return this;
    }


    static format(transaction: Transaction): TransactionData {
        const transactionData: TransactionData = {
            emitter: transaction.emitter,
            signature: transaction.signature,
            amount: transaction.amount,
            instructions: transaction.instructions,
        };

        return transactionData;
    }
}




export async function executeTransaction(blockchain: Blockchain, tx: Transaction): Promise<TransactionReceipt> {
    let txFees: bigint = 0n;
    let amountUsed: bigint = 0n;

    const emitterAccount = blockchain.getAccount(tx.emitter);
    asserts(emitterAccount, `[executeTransaction] emitterAccount "${tx.emitter}" not found`);

    const nonce = emitterAccount.transactionsCount;

    try {
        for (const instruction of tx.instructions) {
            if (instruction.type === 'transfer') {
                // Transfer value
                blockchain.transfer(tx.emitter, instruction.recipient, instruction.amount);
                txFees += 21n; // 21 microcoins for simple transfer
                amountUsed += instruction.amount;

            } else if (instruction.type === 'create') {
                // Create smart contract

                const contractAccount = blockchain.getAccount(instruction.scriptAddress);
                contractAccount.abi = instruction.abi;
                contractAccount.code = instruction.code;
                contractAccount.memory = {};

                txFees += 100n; // 100 microcoins for token creation


            } else if (instruction.type === 'call') {
                // Execute script

                // Start time measure
                performance.mark("script-start")

                // Load source code
                await execVm(blockchain, tx.emitter, instruction.scriptAddress, instruction.scriptClass, instruction.scriptMethod, instruction.scriptArgs)

                // Stop time measure
                performance.mark("script-end");
                const measure = performance.measure("script", "script-start", "script-end")

                // Calculate fees
                txFees += BigInt(Math.ceil(100 * measure.duration)); // 100 microCoins per milliseconds

            } else {
                throw new Error(`unknown instruction type`);
            }
        }

    } catch (err: any) {
        console.warn(`[executeTransaction] ERROR. ${err.message}`);
        err.fees = txFees;
        throw err;
    }


    if (amountUsed !== tx.amount) {
        const err: any = new Error(`[executeTransaction] amount not fully used`);
        err.fees = txFees;
        throw err;
    }


    const signature: TransactionHash = computeHash({
        emitter: tx.emitter,
        amount: tx.amount,
        nonce,
        instructions: tx.instructions,
    });

    const receipt: TransactionReceipt = {
        signature,
        amount: tx.amount,
        fees: txFees,
        //logs,
    }

    return receipt;
}


