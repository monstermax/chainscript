// transaction.ts

import fs from 'fs';
import { AbiCoder } from 'ethers'

import * as ethereumjsTx from '@ethereumjs/tx';

import { chainId } from './config';
import { asserts, bufferToHex, computeHash, hexToUint8Array, jsonReplacer, now, toHex } from './utils';
import { Blockchain } from './blockchain';
import { Block } from './block';
import { predictContractAddress } from './account';
import { execVm } from './vm';
import { findMethodAbi, generateContractAbi } from './abi';

import type { AbiClassMethod, AccountAddress } from './types/account.types';
import type { TransactionData, TransactionHash, TransactionInstruction, TransactionInstructionExecute, TransactionInstructionCreate, TransactionInstructionMint, TransactionInstructionTransfer, TransactionReceipt, TransactionReceiptData, TransactionReceiptRpc, TransactionRpc } from './types/transaction.types';
import type { BlockHash } from './types/block.types';
import type { HexNumber } from './types/types';
import type { callTxParams, sendTxParams as SendTxParams } from './types/rpc.types';


/* ######################################################### */


export class Transaction {
    public from: AccountAddress;
    public hash: TransactionHash | null = null;
    public amount: bigint;
    public instructions: TransactionInstruction[] = [];
    public nonce: bigint | null;
    public blockHeight: number | null = null; // TODO: a deplacer dans les receipts
    public blockHash: BlockHash | null = null; // TODO: a deplacer dans les receipts
    public contractAddress: AccountAddress | null = null;


    constructor(from: AccountAddress, amount: bigint=0n, nonce?: bigint | null) {
        this.from = from;
        this.amount = amount;
        this.nonce = nonce ?? null;
    }

    static from(txData: TransactionData) {
        const tx = new Transaction(txData.from, txData.value, txData.nonce);
        Object.assign(tx, txData);
        return tx;
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


    public create(code: string, amount=0n): this {
        asserts(this.nonce, `missing transaction nonce`);
        const contractAddress: AccountAddress = predictContractAddress(this.from, this.nonce)
        console.log(`[${now()}][Transaction][create] Adresse du contrat à créer :`, contractAddress);

        const instruction: TransactionInstructionCreate = {
            type: 'create',
            contractAddress,
            code,
            value: amount,
        };

        this.instructions.push(instruction);

        return this;
    }


    public execute(contractAddress: AccountAddress, className: string, methodName: string, args: any[]=[]): this {
        const instruction: TransactionInstructionExecute = {
            type: 'execute',
            contractAddress,
            className,
            methodName,
            args,
        };

        this.instructions.push(instruction);

        return this;
    }


    toData(): TransactionData {
        const tx: Transaction = this;

        asserts(typeof tx.nonce === 'bigint', `invalid transaction nonce "${tx.nonce}"`);
        if (typeof tx.from !== 'string') debugger;
        asserts(typeof tx.from === 'string', `invalid transaction emitter type "${tx.from}"`);
        asserts(tx.from.startsWith('0x'), `invalid transaction emitter "${tx.nonce}"`);
        asserts(tx.from === '0x' || tx.from.length === 42, `invalid transaction emitter "${tx.nonce}"`);

        const transactionData: TransactionData = {
            from: tx.from,
            nonce: tx.nonce,
            value: tx.amount,
            instructions: tx.instructions,
            contractAddress: tx.contractAddress,
            //to: '0x',
            //gasPrice: 0n,
            //gasLimit: 0n,
        };


        if (typeof tx.blockHeight === 'number') {
            transactionData.blockHeight = tx.blockHeight;
        }

        //if (tx.to) {
        //    transactionData.to = tx.to;
        //}

        if (tx.hash) {
            transactionData.hash = tx.hash;
        }

        if (tx.blockHash) {
            transactionData.blockHash = tx.blockHash;
        }

        return transactionData;
    }


    toJSON(): string {
        return JSON.stringify(this.toData(), jsonReplacer, 4);
    }


    static formatForRpc(block: Block, tx: Transaction): TransactionRpc {
        // Doc: https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyhash/

        asserts(block.hash, `[Transaction.formatForRpc] missing block hash`);
        asserts(tx.hash, `[Transaction.formatForRpc] missing transaction hash`);

        const to: AccountAddress | null = tx.instructions.filter(instruction => instruction.type === 'transfer').at(0)?.recipient
            ?? tx.instructions.filter(instruction => instruction.type === 'mint').at(0)?.address
            ?? null;
        //asserts(to, `[Transaction.formatForRpc] invalid recipient`);

        const transactionIndex = block.transactions.findIndex(_tx => _tx.hash === tx.hash);
        asserts(transactionIndex > -1, `[Transaction.formatForRpc] transaction not found`);

        const transactionRpc: TransactionRpc = {
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
            nonce: toHex(tx.nonce ?? 0),
            r: "0x",
            s: "0x",
            to: to,
            transactionIndex: toHex(transactionIndex),
            type: "0x2",
            v: "0x1",
            value: toHex(tx.amount),
            //yParity: "0x1",
        };

        return transactionRpc;
    }


    static toReceiptData(receipt: TransactionReceipt): TransactionReceiptData {
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
        //asserts(to, `[Transaction.formatForRpc] invalid recipient`);

        const transactionIndex = block.transactions.findIndex(_tx => _tx.hash === tx.hash);
        asserts(transactionIndex > -1, `[Transaction.formatForRpc] transaction not found`);

        const receiptRpc: TransactionReceiptRpc = {
            blockHash: block.hash,
            blockNumber: toHex(block.blockHeight),
            contractAddress: tx.contractAddress,
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

        return receiptRpc;
    }


    computeHash(): TransactionHash {
        const transactionFormatted: TransactionData = this.toData();
        delete transactionFormatted.blockHash;
        delete transactionFormatted.blockHeight;

        const transactionHash: TransactionHash = computeHash(transactionFormatted);

        if (false && fs.existsSync('/tmp/debug')) {
            // DEBUG
            const debugFile = `/tmp/debug/tx-${Date.now()}-${transactionHash}.json`;
            fs.writeFileSync(debugFile, JSON.stringify(transactionFormatted, jsonReplacer, 4));
        }

        return transactionHash;
    }

}





// Execute un contrat (en lecture seule) dans la VM et retourne le résultat
export async function handleEthCall(blockchain: Blockchain, txParams: callTxParams): Promise<any> {
    const contractAccount = blockchain.getAccount(txParams.to as AccountAddress, null);
    asserts(contractAccount, `contract not found`);
    asserts(contractAccount.abi, `contract abi not found`);

    // Signature de la classe+methode à appeler
    asserts(txParams.data && txParams.data.length >= 10);
    const callSignature = txParams.data.slice(0, 10); // 4 premiers bytes
    const callSignature2 = bufferToHex(Buffer.from(txParams.data).slice(0, 4)); // 4 premiers bytes

    // Cherche la classe+methode à partir de la signature
    const abiClassMethod = findMethodAbi(contractAccount.abi, callSignature);
    asserts(abiClassMethod, "Méthode inconnue");

    // Décodage des parametres de la methode
    const args = decodeTxData(txParams.data, abiClassMethod);
    console.log(`[eth_call] Arguments décodés:`, args)

    // Execution du code dans la VM
    const { vmResult, vmMonitor } = await execVm(blockchain, txParams.from, txParams.to, abiClassMethod.className, abiClassMethod.methodName, args, null);

    console.log(`[eth_call] ✅ Résultat:`, vmResult);
    console.log(`[eth_call] 🔍 Nombre total de calls:`, vmMonitor.totalCalls);
    console.log(`[eth_call] 📜 Stack des calls:`, vmMonitor.callStack.join(" -> "));

    return vmResult;
}



// Gère l'envoi d'une transaction Ethereum
export async function handleEthSendTransaction(blockchain: Blockchain, txData: TransactionData): Promise<TransactionHash> {
    console.log(`[handleEthSendTransaction] 📩 Traitement d'une transaction`, txData);

    const amount: bigint = BigInt(txData.value ?? 0);
    const nonce: bigint = BigInt(txData.nonce ?? 0);

    const tx = new Transaction(txData.from, amount, nonce);
    tx.instructions = txData.instructions;

    blockchain.mempool.addTransaction(tx);
    console.log(`[handleEthSendTransaction] 📥 Transaction ajoutée à la mempool`);

    return tx.hash as TransactionHash;
}





// Transcode un txParams (format Ethereum) au format TransactionData (Typescript Blockchain) en y ajoutant des instructions
export function transcodeTx(blockchain: Blockchain, txParams: SendTxParams): TransactionData {

    const value: bigint = BigInt(txParams.value ?? 0n);
    const nonce: bigint = BigInt(txParams.nonce)

    const instructions: TransactionInstruction[] = [];


    // Ajout instruction de transfert si `amount > 0`
    if (value > 0n && txParams.to) {
        const instruction: TransactionInstructionTransfer = {
            type: 'transfer',
            amount: value,
            recipient: txParams.to,
        };
        instructions.push(instruction);
    }


    // Ajout instruction d'appel si txParams.data n'est pas vide
    if (txParams.data) {

        if (txParams.to) {
            // Executer la methode d'un contrat existant

            // 🔎 Recherche du contrat et de son ABI
            const contractAccount = blockchain.getAccount(txParams.to, null);
            asserts(contractAccount, `[transcodeTx] Contrat introuvable à ${txParams.to}`);
            asserts(contractAccount.abi, `[transcodeTx] missing contract abi à ${txParams.to}`);
            asserts(contractAccount.code, `[transcodeTx] missing contract code à ${txParams.to}`);

            const callSignature2: string = txParams.data.slice(0, 10); // 4 bytes
            const callSignature: string = "0x" + txParams.data.slice(0, 8);
            const callSignature1: string = "0x" + bufferToHex(Buffer.from(txParams.data).slice(0, 8));

            // Trouver la méthode correspondante dans l'ABI
            const abiClassMethod: AbiClassMethod | null = findMethodAbi(contractAccount.abi, callSignature);
            asserts(abiClassMethod, `[transcodeTx] Méthode inconnue pour la signature ${callSignature}`);

            // 🧩 Décoder les arguments
            const args: any[] = decodeTxData(txParams.data, abiClassMethod);
            console.log(`[${now()}][transcodeTx] 🔍 Arguments décodés:`, args);

            instructions.push({
                type: 'execute',
                contractAddress: txParams.to,
                className: abiClassMethod.className,
                methodName: abiClassMethod.methodName,
                args,
            } as TransactionInstructionExecute);

        } else {
            // Créer un nouveau contrat

            const contractAddress: AccountAddress = predictContractAddress(txParams.from, nonce)
            console.log(`[${now()}][transcodeTx] Adresse du contrat à créer :`, contractAddress);


            const coder = new AbiCoder();
            //const codes2 = coder.decode(["string", "string"], txParams.data);
            const codes = coder.decode(["string", "string"], "0x" + txParams.data);


            if (!codes) {
                throw new Error('CONTRACT_DEPLOY_CODE_PARSING_FAILED');
            }

            const contractCode: string = codes[0];
            const contructorArgs: any[] = codes[1];

            const instruction: TransactionInstructionCreate = {
                type: 'create',
                contractAddress,
                code: contractCode,
                params: contructorArgs,
                value,
            };

            instructions.push(instruction);
        }
    }


    // Création de l'objet `TransactionData`
    const txData: TransactionData = {
        from: txParams.from,
        nonce,
        value,
        instructions,
        //hash: '0x' + bufferToHex(tx.hash()) as TransactionHash,
    };

    console.log(`[${now()}][decodeTx] ✅ Transaction décodée:`, txData);
    return txData;
}



/** Décode une transaction Ethereum en un objet TransactionData */
export function decodeRawTransaction(blockchain: Blockchain, txRawData: string): TransactionData {
    console.log(`[${now()}][decodeTx] 🔄 Début décodage de: ${txRawData}`);

    const rawBuffer = hexToUint8Array(txRawData);
    let tx: ethereumjsTx.FeeMarketEIP1559Transaction | ethereumjsTx.LegacyTransaction;

    try {
        if (rawBuffer[0] === 2) {
            // EIP-1559 Transaction
            console.log(`[${now()}][decodeTx] 🆕 Transaction EIP-1559 détectée.`);
            tx = ethereumjsTx.FeeMarketEIP1559Transaction.fromSerializedTx(rawBuffer) as ethereumjsTx.FeeMarketEIP1559Transaction;

        } else {
            // Legacy Transaction
            console.log(`[${now()}][decodeTx] 🔄 Transaction Legacy détectée.`);
            tx = ethereumjsTx.LegacyTransaction.fromSerializedTx(rawBuffer) as ethereumjsTx.LegacyTransaction;
        }

    } catch (err: any) {
        console.error(`[${now()}][decodeTx] ❌ Impossible de décoder la transaction:`, err);
        throw new Error(`[decodeTx] Invalid transaction format`);
    }


    const txParams: SendTxParams = {
        from: tx.getSenderAddress().toString(),
        to: tx.to?.toString() as AccountAddress | undefined,
        value: toHex(tx.value),
        nonce: toHex(tx.nonce),
        data: bufferToHex(tx.data) as HexNumber,
    };


    // Transcode le txParams (format Ethereum) au format TransactionData et retourne cette information, prête à être envoyée à handleEthSendTransaction()
    return transcodeTx(blockchain, txParams);
}




export async function executeTransaction(blockchain: Blockchain, block: Block, tx: Transaction): Promise<TransactionReceipt> {
    let txFees: bigint = 0n;
    let amountUsed: bigint = 0n;


    // Vérifie le hash de la transaction
    const computedTxHash = tx.computeHash();
    asserts(computedTxHash === tx.hash, `transaction hash mismatch`);


    const emitterAccount = blockchain.getAccount(tx.from, blockchain.memoryState);
    asserts(emitterAccount, `[executeTransaction] emitterAccount "${tx.from}" not found`);


    try {
        for (const instruction of tx.instructions) {
            if (instruction.type === 'mint') {
                // Mint value

                asserts(tx.from === '0x', `invalid emitter for mint. Expected: "0x" / Found: ${tx.from}`);

                const minerAccount = blockchain.getAccount(instruction.address, blockchain.memoryState);
                asserts(minerAccount, `[executeTransaction] minerAccount "${instruction.address}" not found`);

                blockchain.mint(minerAccount, instruction.amount);
                amountUsed += instruction.amount;

            } else if (instruction.type === 'transfer') {
                // Transfer value

                blockchain.transfer(tx.from, instruction.recipient, instruction.amount, blockchain.memoryState);
                txFees += 21n; // 21 microcoins for simple transfer
                amountUsed += instruction.amount;

            } else if (instruction.type === 'create') {
                // Create smart contract

                const contractAddress: AccountAddress = instruction.contractAddress;

                if (! tx.contractAddress) {
                    // Si plusieurs contrats créés en 1 seul transaction (si plusieurs instructions create), on affecte l'adresse du 1er contractAddress à la transaction
                    tx.contractAddress = contractAddress;
                }

                const contractAccount = blockchain.getAccount(contractAddress, blockchain.memoryState);
                asserts(contractAccount.balance === 0n, `account "${contractAddress}" already exists (balance > 0)`);
                asserts(contractAccount.code === null, `account "${contractAddress}" already exists (code exists)`);
                asserts(contractAccount.abi === null, `account "${contractAddress}" already exists (abi exists)`);

                contractAccount.abi = generateContractAbi(instruction.code);
                contractAccount.code = instruction.code;
                //contractAccount.contructorArgs = instruction.params;
                contractAccount.memory = {};

                amountUsed += instruction.value ?? 0n;

                txFees += 1000n; // 1000 microcoins for token creation


            } else if (instruction.type === 'execute') {
                // Execute script

                // Load source code
                const { vmResult, vmMonitor } = await execVm(blockchain, tx.from, instruction.contractAddress, instruction.className, instruction.methodName, instruction.args, blockchain.memoryState)

                console.log(`[executeTransaction][vmResult] ✅ Résultat:`, vmResult); // pas de résultat attendu pour un sendTransaction
                console.log(`[executeTransaction][vmResult] 🔍 Nombre total de calls:`, vmMonitor.totalCalls);
                console.log(`[executeTransaction][vmResult] 📜 Stack des calls:`, vmMonitor.callStack.join(" -> "));

                // Calculate fees
                txFees += BigInt(Math.ceil(100 * vmMonitor.totalCalls)); // 100 microCoins per call

                asserts(vmMonitor.totalCalls < 1000, `[executeTransaction] execution limit exceeded`);

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

            // TODO: gérer les annulations de transactions (pas de fees ?)
        }

        // Increment account transactions count
        emitterAccount.incrementTransactions();

    } catch (err: any) {
        console.warn(`[${now()}][executeTransaction] ERROR. ${err.message}`);
        err.fees = txFees;
        throw err;
    }


    const receipt: TransactionReceipt = {
        success: true,
        fees: txFees,
        //logs,
    }

    return receipt;
}



// Décode un `eth_call` reçu en argument et retourne une liste d'arguments décodés
export function decodeTxData(data: string, abiClassMethod: AbiClassMethod): any[] {
    if (!abiClassMethod.method.inputs || abiClassMethod.method.inputs.length === 0) return [];

    const coder = new AbiCoder();
    const encodedParams = data.slice(10); // Supprime la signature de 4 bytes

    //const types = abiClassMethod.method.inputs.map(_ => 'string'); // supposons que tous les parametre de la methode soient des string (le plus safe pour JS)

    // Utiliser les vrais types des paramètres extraits de l'ABI
    const types = abiClassMethod.method.inputs.map(inputName => {
        // 🎯 Corrige le type si nécessaire
        //if (inputName.includes("address")) return "address";
        //if (inputName.includes("amount")) return "uint256"; // Supposition logique
        return "string"; // Fallback pour JS
    });

    console.log(`[decodeTxData] 📥 Décodage des arguments:`, encodedParams);

    try {
        const result = coder.decode(types, "0x" + encodedParams);
        return result;

    } catch (err: any) {
        console.error(`[decodeTxData] ❌ Erreur de décodage des arguments`, err);
        //return [];
        throw err;
    }
}
