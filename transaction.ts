// transaction.ts

import * as ethereumjsTx from '@ethereumjs/tx';
import * as ethereumjsUtil from '@ethereumjs/util';

import { chainId } from './config';
import { asserts, bufferToHex, computeHash, hexToUint8Array, toHex } from './utils';
import { Blockchain } from './blockchain';
import { Block } from './block';
import { execVm } from './vm';

import type { AccountAddress, CodeAbi } from './types/account.types';
import type { TransactionData, TransactionHash, TransactionInstruction, TransactionInstructionCall, TransactionInstructionCreate, TransactionInstructionMint, TransactionInstructionTransfer, TransactionReceipt, TransactionReceiptData, TransactionReceiptRpc, TransactionRpc } from './types/transaction.types';


/* ######################################################### */


export class Transaction {
    public from: AccountAddress;
    public hash: TransactionHash | null = null;
    public amount: bigint;
    public instructions: TransactionInstruction[] = [];
    public nonce: bigint;
    public blockHeight: number | null = null;


    constructor(emitter: AccountAddress, amount: bigint=0n, nonce=0n) {
        this.from = emitter;
        this.amount = amount;
        this.nonce = nonce;
    }


    public mint(address: AccountAddress, amount: bigint): this {
        const instruction: TransactionInstructionMint = {
            type: 'mint',
            address,
            amount,
        };

        this.instructions.push(instruction);

        return this;
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


    public create(abi: CodeAbi, code: string): this {
        const instruction: TransactionInstructionCreate = {
            type: 'create',
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


    static toJSON(tx: Transaction): TransactionData {
        asserts(typeof tx.nonce === 'bigint', `invalid transaction nonce "${tx.nonce}"`);
        if (typeof tx.from !== 'string') debugger;
        asserts(typeof tx.from === 'string', `invalid transaction emitter type "${tx.from}"`);
        asserts(tx.from.startsWith('0x'), `invalid transaction emitter "${tx.nonce}"`);
        asserts(tx.from === '0x' || tx.from.length === 42, `invalid transaction emitter "${tx.nonce}"`);

        const transactionData: TransactionData = {
            nonce: tx.nonce,
            //to: '0x',
            //gasPrice: 0n,
            //gasLimit: 0n,
            from: tx.from,
            hash: tx.hash,
            amount: tx.amount,
            instructions: tx.instructions,
        };

        return transactionData;
    }


    static formatForRpc(block: Block, tx: Transaction): TransactionRpc {
        // Doc: https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyhash/

        asserts(block.hash, `[Transaction.formatForRpc] missing block hash`);
        asserts(tx.hash, `[Transaction.formatForRpc] missing transaction hash`);

        const recipient: AccountAddress | null = tx.instructions.filter(instruction => instruction.type === 'transfer').at(0)?.recipient ?? null;
        asserts(recipient, `[Transaction.formatForRpc] invalid recipient`);

        const transactionIndex = block.transactions.findIndex(_tx => _tx.hash === tx.hash);
        asserts(transactionIndex > -1, `[Transaction.formatForRpc] transaction not found`);

        const transactionData: TransactionRpc = {
            accessList: [],
            blockHash: block.hash,
            blockNumber: toHex(block.blockHeight),
            chainId: toHex(chainId),
            from: tx.from,
            gas: "0x1",
            gasPrice: "0x1",
            hash: tx.hash,
            input: "0x",
            maxFeePerGas: "0x1",
            maxPriorityFeePerGas: "0x1",
            nonce: toHex(tx.nonce),
            r: "0x",
            s: "0x",
            to: recipient,
            transactionIndex: toHex(transactionIndex),
            type: "0x2",
            v: "0x1",
            value: toHex(tx.amount),
            //yParity: "0x1",
        };

        return transactionData;
    }


    static toReceiptJSON(receipt: TransactionReceipt): TransactionReceiptData {
        const receiptData: TransactionReceiptData = {
            success: receipt.success,
            fees: receipt.fees,
        };

        return receiptData;
    }


    static formatReceiptForRpc(block: Block, tx: Transaction): TransactionReceiptRpc {

        asserts(block.hash, `[Transaction.formatForRpc] missing block hash`);
        asserts(tx.hash, `[Transaction.formatForRpc] missing transaction hash`);

        const to: AccountAddress | null = tx.instructions.filter(instruction => instruction.type === 'transfer').at(0)?.recipient ?? null;
        asserts(to, `[Transaction.formatForRpc] invalid recipient`);

        const transactionIndex = block.transactions.findIndex(_tx => _tx.hash === tx.hash);
        asserts(transactionIndex > -1, `[Transaction.formatForRpc] transaction not found`);

        const receiptData: TransactionReceiptRpc = {
            blockHash: block.hash,
            blockNumber: toHex(block.blockHeight),
            contractAddress: null,
            cumulativeGasUsed: "0x",
            effectiveGasPrice: "0x",
            from: tx.from,
            gasUsed: "0x",
            logs: [],
            logsBloom: "0x",
            status: "0x1",
            to: to,
            transactionHash: tx.hash,
            transactionIndex: toHex(transactionIndex),
            type: "0x2"
          };

        return receiptData;
    }


    computeHash(): TransactionHash {
        const transactionFormatted = Transaction.toJSON(this);
        const transactionHash: TransactionHash = computeHash(transactionFormatted);

        return transactionHash;
    }

}




export async function executeTransaction(blockchain: Blockchain, tx: Transaction): Promise<TransactionReceipt> {
    let txFees: bigint = 0n;
    let amountUsed: bigint = 0n;

    const emitterAccount = blockchain.getAccount(tx.from);
    asserts(emitterAccount, `[executeTransaction] emitterAccount "${tx.from}" not found`);

    //const nonce = emitterAccount.transactionsCount;

    try {
        for (const instruction of tx.instructions) {
            if (instruction.type === 'mint') {
                // Mint value

                asserts(tx.from === '0x', `invalid emitter for mint. Expected: "0x" / Found: ${tx.from}`);

                const minerAccount = blockchain.getAccount(instruction.address);
                asserts(minerAccount, `[executeTransaction] minerAccount "${instruction.address}" not found`);

                blockchain.mint(minerAccount, instruction.amount);
                amountUsed += instruction.amount;

            } else if (instruction.type === 'transfer') {
                // Transfer value

                blockchain.transfer(tx.from, instruction.recipient, instruction.amount);
                txFees += 21n; // 21 microcoins for simple transfer
                amountUsed += instruction.amount;

            } else if (instruction.type === 'create') {
                // Create smart contract

                const scriptAddress = computeHash(instruction).slice(0, 42) as AccountAddress;

                const contractAccount = blockchain.getAccount(scriptAddress);

                asserts(contractAccount.balance === 0n, `account "${scriptAddress}" already exists (balance > 0)`);
                asserts(contractAccount.code === null, `account "${scriptAddress}" already exists (code exists)`);
                asserts(contractAccount.abi === null, `account "${scriptAddress}" already exists (abi exists)`);

                contractAccount.abi = instruction.abi;
                contractAccount.code = instruction.code;
                contractAccount.memory = {};

                txFees += 100n; // 100 microcoins for token creation


            } else if (instruction.type === 'call') {
                // Execute script

                // Start time measure
                performance.mark("script-start")

                // Load source code
                await execVm(blockchain, tx.from, instruction.scriptAddress, instruction.scriptClass, instruction.scriptMethod, instruction.scriptArgs)

                // Stop time measure
                performance.mark("script-end");
                const measure = performance.measure("script", "script-start", "script-end")

                // Calculate fees
                txFees += BigInt(Math.ceil(100 * measure.duration)); // 100 microCoins per milliseconds

            } else {
                throw new Error(`unknown instruction type`);
            }
        }

        if (amountUsed !== tx.amount) {
            throw new Error(`[executeTransaction] amount not fully used`);
        }

        if (txFees > 0n) {
            // Burn fees
            blockchain.burn(emitterAccount, txFees);

        } else {
            asserts(tx.from === '0x', `invalid emitter for transaction without fees. Expected: "0x" / Found: ${tx.from}`);
        }

        // Increment account transactions count
        emitterAccount.incrementTransactions();

    } catch (err: any) {
        console.warn(`[executeTransaction] ERROR. ${err.message}`);
        err.fees = txFees;
        throw err;
    }


    asserts(tx.hash, `missing transaction hash`)


    const receipt: TransactionReceipt = {
        success: true,
        fees: txFees,
        //logs,
    }

    return receipt;
}





/** ✅ Décode une transaction Ethereum en un objet TransactionData */
export function decodeTx(raw_tx: string): TransactionData {
    try {
        console.log(`[decodeTx] 🔄 Début décodage de: ${raw_tx}`);

        const rawBuffer = hexToUint8Array(raw_tx);
        let tx: ethereumjsTx.FeeMarketEIP1559Transaction | ethereumjsTx.LegacyTransaction;

        try {
            if (rawBuffer[0] === 2) {
                // EIP-1559 Transaction
                console.log("[decodeTx] 🆕 Transaction EIP-1559 détectée.");
                tx = ethereumjsTx.FeeMarketEIP1559Transaction.fromSerializedTx(rawBuffer) as ethereumjsTx.FeeMarketEIP1559Transaction;

            } else {
                // Legacy Transaction
                console.log("[decodeTx] 🔄 Transaction Legacy détectée.");
                tx = ethereumjsTx.LegacyTransaction.fromSerializedTx(rawBuffer) as ethereumjsTx.LegacyTransaction;
            }

        } catch (err: any) {
            console.error("[decodeTx] ❌ Impossible de décoder la transaction:", err);
            throw new Error("[decodeTx] Invalid transaction format");
        }

        const amount = BigInt(tx.value.toString());
        const to = (tx.to ? tx.to.toString() : '0x') as AccountAddress;
        const instructions: TransactionInstruction[] = [];

        // ✅ Ajout instruction de transfert si `amount > 0`
        if (amount > 0n) {
            instructions.push({ type: 'transfer', amount, recipient: to } as TransactionInstructionTransfer);
        }

        // ✅ Ajout instruction d'appel si `tx.data` contient un contrat
        if (tx.data.length > 0) {
            instructions.push({
                type: 'call',
                scriptAddress: to,
                scriptClass: '',
                scriptMethod: '',
                scriptArgs: [],
            } as TransactionInstructionCall);
        }

        // ✅ Création de l'objet `TransactionData`
        const txData: TransactionData = {
            from: '0x',
            nonce: BigInt(tx.nonce.toString()),
            //gasPrice: tx.gasPrice ? BigInt(tx.gasPrice.toString()) : 0n,
            //gasLimit: BigInt(tx.gasLimit.toString()),
            //to,
            amount,
            instructions,
            hash: '0x' + bufferToHex(tx.hash()) as TransactionHash,
        };

        if (tx.r /* && tx.s && tx.v */ ) {
            Object.assign(txData, {
                from: ethereumjsUtil.Address.fromPublicKey(tx.getSenderPublicKey()).toString() as AccountAddress,
                //from: tx.getSenderAddress().toString() as AccountAddress,
                //r: bufferToHex(tx.r),
                //s: bufferToHex(tx.s),
                //v: bufferToHex(tx.v),
            });
        }

        console.log("[decodeTx] ✅ Transaction décodée:", txData);
        return txData;

    } catch (err: any) {
        console.warn(`[decodeTx ERR] ❌ ${err.message}`);
        throw err;
    }
}

