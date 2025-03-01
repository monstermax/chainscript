// execution.ts

import { AbiCoder, Result } from 'ethers'
import * as ethereumjsTx from '@ethereumjs/tx';

import { asserts, bufferToHex, hexToUint8Array, now, toHex } from '@backend/helpers/utils';
import { Blockchain } from '@backend/blockchain/blockchain';
import { Block } from '@backend/blockchain/block';
import { predictContractAddress } from '@backend/blockchain/account';
import { Transaction } from '@backend/blockchain/transaction';
import { execVm } from './vm';
import { findMethodAbi, instanciateContractAndGenerateAbi } from './abi';

import type { AbiSearchResult, AccountAddress } from '@backend/types/account.types';
import type { TransactionData, TransactionHash, TransactionInstruction, TransactionInstructionExecute, TransactionInstructionCreate, TransactionInstructionTransfer, TransactionReceiptData } from '@backend/types/transaction.types';
import type { HexNumber } from '@backend/types/types';
import type { callTxParams, sendTxParams as SendTxParams } from '@backend/types/rpc.types';
import { TransactionReceipt } from '@backend/blockchain/receipt';
import { emptyAddress } from '@backend/config';



/* ######################################################### */


/** Execute un contrat (en lecture seule) dans la VM et retourne le résultat */
export async function handleEthCall(blockchain: Blockchain, txParams: callTxParams): Promise<any> {
    const contractAccount = blockchain.getAccount(txParams.to as AccountAddress, null);
    asserts(contractAccount.abi, `[handleEthCall] contract abi not found. may not be a contract...`);
    asserts(contractAccount.code, `[handleEthCall] contract code not found`);

    // Signature de la classe+methode à appeler
    asserts(txParams.data && txParams.data.length >= 10);
    const callSignature = txParams.data.slice(0, 10); // 4 premiers bytes

    // Cherche la classe+methode à partir de la signature
    const abisearchResult = findMethodAbi(contractAccount.abi, callSignature);
    asserts(abisearchResult, "[handleEthCall] Méthode inconnue");

    // Décodage des parametres de la methode
    const methodArgs = decodeTxData(txParams.data.slice(2), abisearchResult);
    console.log(`[handleEthCall] Arguments décodés:`, methodArgs)

    // Execution du code dans la VM
    const { vmResult, vmMonitor, vmError } = await execVm(blockchain, txParams.from, txParams.to, abisearchResult.className, abisearchResult.methodName, methodArgs, null);

    if (vmError) {
        console.log(`[handleEthCall] ❌ Error:`, vmError);

    } else {
        console.log(`[handleEthCall] ✅ Résultat:`, vmResult);
    }

    console.log(`[handleEthCall] 🔍 Nombre total de calls:`, vmMonitor.totalCalls);
    console.log(`[handleEthCall] 📜 Stack des calls:`, vmMonitor.callStack.join(" -> "));

    return vmResult;
}



// Gère l'envoi d'une transaction Ethereum
export async function handleEthSendTransaction(blockchain: Blockchain, txData: TransactionData): Promise<TransactionHash> {
    console.log(`[handleEthSendTransaction] 📩 Traitement d'une transaction`, { from: txData.from, nonce: txData.nonce, value: txData.value });

    const amount: bigint = BigInt(txData.value ?? 0);
    const nonce: bigint | undefined = (typeof txData.nonce === 'bigint') ? txData.nonce : undefined;

    const tx = new Transaction(txData.from, amount, nonce);
    tx.instructions = txData.instructions;

    blockchain.mempool.addTransaction(tx);
    console.log(`[handleEthSendTransaction] 📥 Transaction ajoutée à la mempool`);

    return tx.hash as TransactionHash;
}





/** Transcode un txParams (format Ethereum) au format TransactionData (Typescript Blockchain) en y ajoutant des instructions */
export function transcodeTx(blockchain: Blockchain, txParams: SendTxParams): TransactionData {
    asserts(typeof txParams.nonce === 'string', `[transcodeTx] missing transaction nonce`);

    const value: bigint = BigInt(txParams.value ?? 0n);
    const nonce: bigint = BigInt(txParams.nonce)

    const instructions: TransactionInstruction[] = [];


    // Ajout instruction de transfert si `amount > 0` (et si pas d'appel à un smart contract)
    if (value > 0n && txParams.to && ! txParams.data) {
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

            const callSignature: string = "0x" + txParams.data.slice(0, 8);

            // Trouver la méthode correspondante dans l'ABI
            const abiClassMethod: AbiSearchResult | null = findMethodAbi(contractAccount.abi, callSignature);
            asserts(abiClassMethod, `[transcodeTx] Méthode inconnue pour la signature ${callSignature}`);

            // 🧩 Décoder les arguments
            const methodArgs: string[] = decodeTxData(txParams.data, abiClassMethod);
            console.log(`[${now()}][transcodeTx] 🔍 Arguments décodés:`, methodArgs);

            const instruction: TransactionInstructionExecute = {
                type: 'execute',
                contractAddress: txParams.to,
                className: abiClassMethod.className,
                methodName: abiClassMethod.methodName,
                methodArgs,
                amount: value,
            };
            instructions.push(instruction);

        } else {
            // Créer un nouveau contrat

            const contractAddress: AccountAddress = predictContractAddress(txParams.from, nonce)
            console.log(`[${now()}][transcodeTx] Adresse du contrat à créer :`, contractAddress);


            const coder = new AbiCoder();
            //const codes2 = coder.decode(["string", "string", "string"], txParams.data);
            const codes = coder.decode(["string", "string", "string"], "0x" + txParams.data);


            if (!codes) {
                throw new Error('CONTRACT_DEPLOY_CODE_PARSING_FAILED');
            }

            const contractCode: string = codes[0];
            const contractClass: string = codes[1];
            const contructorArgsJSON: string = codes[2] ?? '[]';
            const contructorArgs: string[] = JSON.parse(contructorArgsJSON);

            const instruction: TransactionInstructionCreate = {
                type: 'create',
                contractAddress,
                contractClass,
                code: contractCode,
                contructorArgs,
                amount: value,
            };

            instructions.push(instruction);
        }
    }


    // Création de l'objet `TransactionData`
    const txData: TransactionData = {
        hash: null,
        blockHash: null,
        blockHeight: null,
        transactionIndex: null,
        from: txParams.from,
        nonce,
        value,
        instructions,
        //hash: '0x' + bufferToHex(tx.hash()) as TransactionHash,
    };

    console.log(`[${now()}][transcodeTx] ✅ Transaction décodée:`, { from: txData.from, nonce: txData.nonce, value: txData.value });
    return txData;
}



/** Décode une transaction Ethereum en un objet TransactionData */
export function decodeRawTransaction(blockchain: Blockchain, txRawData: string): SendTxParams {
    console.log(`[${now()}][decodeRawTransaction] 🔄 Début décodage de: ${txRawData.length} caracteres hexa`);

    const rawBuffer = hexToUint8Array(txRawData);
    let tx: ethereumjsTx.FeeMarketEIP1559Transaction | ethereumjsTx.LegacyTransaction;

    try {
        if (rawBuffer[0] === 2) {
            // EIP-1559 Transaction
            console.log(`[${now()}][decodeRawTransaction] 🆕 Transaction EIP-1559 détectée.`);
            tx = ethereumjsTx.FeeMarketEIP1559Transaction.fromSerializedTx(rawBuffer) as ethereumjsTx.FeeMarketEIP1559Transaction;

        } else {
            // Legacy Transaction
            console.log(`[${now()}][decodeRawTransaction] 🔄 Transaction Legacy détectée.`);
            tx = ethereumjsTx.LegacyTransaction.fromSerializedTx(rawBuffer) as ethereumjsTx.LegacyTransaction;
        }

    } catch (err: any) {
        console.error(`[${now()}][decodeRawTransaction] ❌ Impossible de décoder la transaction:`, err);
        throw new Error(`[decodeRawTransaction] Invalid transaction format`);
    }


    const txParams: SendTxParams = {
        from: tx.getSenderAddress().toString(),
        to: tx.to?.toString() as AccountAddress | undefined,
        value: toHex(tx.value),
        nonce: toHex(tx.nonce),
        data: bufferToHex(tx.data) as HexNumber,
    };

    return txParams;
}



/** Exécute une transaction (d'un block) */
export async function executeTransaction(blockchain: Blockchain, block: Block, tx: Transaction): Promise<TransactionReceipt> {
    let txFees: bigint = 0n;
    let amountUsed: bigint = 0n;
    let createdContractAddress: AccountAddress | null = null;
    let error: string | null = null;


    // Vérifie le hash de la transaction
    const computedTxHash = tx.computeHash();
    asserts(computedTxHash === tx.hash, `[${now()}][executeTransaction] transaction hash mismatch. (Found: ${tx.hash} / Computed: ${computedTxHash})`);


    const emitterAccount = blockchain.getAccount(tx.from, blockchain.memoryState);
    asserts(emitterAccount, `[${now()}][executeTransaction] emitterAccount "${tx.from}" not found`);


    try {
        for (const instruction of tx.instructions) {
            if (instruction.type === 'mint') {
                // Mint value

                asserts(tx.from === emptyAddress, `[${now()}][executeTransaction] invalid emitter for mint. Expected: "${emptyAddress}" / Found: ${tx.from}`);

                const minerAccount = blockchain.getAccount(instruction.address, blockchain.memoryState);
                asserts(minerAccount, `[${now()}][executeTransaction] minerAccount "${instruction.address}" not found`);

                blockchain.mint(minerAccount, instruction.amount);
                amountUsed += instruction.amount;

            } else if (instruction.type === 'transfer') {
                // Transfer value

                blockchain.transfer(tx.from, instruction.recipient, instruction.amount, blockchain.memoryState);
                txFees += 21n; // 21 microcoins for simple transfer
                amountUsed += instruction.amount;

            } else if (instruction.type === 'create') {
                // Create smart contract

                createdContractAddress = instruction.contractAddress;

                if (! tx.contractAddress) {
                    // Si plusieurs contrats créés en 1 seul transaction (si plusieurs instructions create), on affecte l'adresse du 1er contractAddress à la transaction
                    tx.contractAddress = createdContractAddress;
                }

                const contractAccount = blockchain.getAccount(createdContractAddress, blockchain.memoryState);
                asserts(contractAccount.balance === 0n, `[${now()}][executeTransaction] account "${createdContractAddress}" already exists (balance > 0)`);
                asserts(contractAccount.code === null, `[${now()}][executeTransaction] account "${createdContractAddress}" already exists (code exists)`);
                asserts(contractAccount.abi === null, `[${now()}][executeTransaction] account "${createdContractAddress}" already exists (abi exists)`);


                try {
                    // Instancie le contrat (et initialize son constructor) puis retourne l'ABI
                    const { abi, contractMemory } = instanciateContractAndGenerateAbi(tx.from, instruction.code, instruction.contractClass, instruction.contructorArgs, createdContractAddress);

                    contractAccount.abi = abi;
                    contractAccount.memory = contractMemory;
                    contractAccount.code = instruction.code;
                    //contractAccount.contructorArgs = instruction.contructorArgs;

                } catch (err: any) {
                    console.log(`[${now()}][executeTransaction] ❌ Error:`, err.message);
                    //throw new Error(err);
                    error = err.message;

                    // TODO: delete contractAccount from memoryState
                }


                txFees += 1000n; // 1000 microcoins for token creation
                amountUsed += instruction.amount ?? 0n;


            } else if (instruction.type === 'execute') {
                // Execute script

                if (instruction.amount) {
                    blockchain.transfer(tx.from, instruction.contractAddress, instruction.amount, blockchain.memoryState);
                }

                // Load source code
                const { vmResult, vmMonitor, vmError } = await execVm(blockchain, tx.from, instruction.contractAddress, instruction.className, instruction.methodName, instruction.methodArgs, blockchain.memoryState, instruction.amount);

                if (vmError) {
                    console.log(`[${now()}][executeTransaction] ❌ Error:`, vmError);
                    //throw new Error(vmError);
                    error = vmError.message;

                } else {
                    console.log(`[${now()}][executeTransaction][vmResult] ✅ Résultat:`, vmResult); // pas de résultat attendu pour un sendTransaction
                }

                console.log(`[${now()}][executeTransaction][vmResult] 🔍 Nombre total de calls:`, vmMonitor.totalCalls);
                console.log(`[${now()}][executeTransaction][vmResult] 📜 Stack des calls:`, vmMonitor.callStack.join(" -> "));

                // Calculate fees
                txFees += BigInt(Math.ceil(100 * vmMonitor.totalCalls)); // 100 microCoins per call
                amountUsed += instruction.amount ?? 0n;

                asserts(vmMonitor.totalCalls < 1000, `[${now()}][executeTransaction] execution limit exceeded`);

            } else {
                throw new Error(`[${now()}][executeTransaction] unknown instruction type`);
            }
        }

        if (amountUsed !== tx.amount) {
            throw new Error(`[${now()}][executeTransaction] used amount mismatch. (Found: ${amountUsed} / Expected: ${tx.amount})`);
        }

        if (txFees > 0n) {
            // Burn fees
            blockchain.burn(emitterAccount, txFees);

        } else {
            asserts(tx.from === emptyAddress, `[${now()}][executeTransaction] invalid emitter for transaction without fees. Expected: "${emptyAddress}" / Found: ${tx.from}`);

            // TODO: gérer les annulations de transactions (pas de fees ?)
        }


        // Assignation du blockHeight
        asserts(!tx.blockHeight || tx.blockHeight === block.blockHeight, `[${now()}][executeTransaction] blockHeight mistmatch`)
        tx.blockHeight = block.blockHeight;


        // Ajout aux transactions du compte
        emitterAccount.addTransaction(tx);

    } catch (err: any) {
        console.warn(`[${now()}][executeTransaction] ERROR. ${err.message}`);
        err.fees = txFees;
        throw err;
    }



    const receiptData: TransactionReceiptData = {
        transactionHash: tx.hash,
        transactionIndex: tx.transactionIndex ?? 0,
        success: !error,
        fees: txFees,
        blockHeight: block.blockHeight,
        blockHash: block.hash ?? '0x',
        contractAddress: createdContractAddress,
        logs: [],
    }


    const receipt = TransactionReceipt.from(receiptData);

    return receipt;
}



/** Décode un `eth_call` (ou les `data` d'un `eth_sendRawTransaction`) reçu en argument et retourne une liste d'arguments décodés */
export function decodeTxData(data: string, abiClassMethod: AbiSearchResult): any[] {
    if (abiClassMethod.type !== 'method' || !abiClassMethod.method.inputs || abiClassMethod.method.inputs.length === 0) return [];

    const coder = new AbiCoder();
    const encodedParams: string = data.slice(8);

    // On force tous les types (inputs) en string (car JS n'est pas typé)
    const inputTypes: string[] = abiClassMethod.method.inputs.map(inputName => "string");

    console.log(`[decodeTxData] 📥 Décodage des arguments (types: [${inputTypes.join(', ')}]) :`, encodedParams.slice(0, 50));

    try {
        const result: Result = coder.decode(inputTypes, "0x" + encodedParams);
        return result;

    } catch (err: any) {
        console.error(`[decodeTxData] ❌ Erreur de décodage des arguments`, err);
        //return [];
        throw err;
    }
}

