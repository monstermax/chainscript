// transaction.ts

import fs from 'fs';
import { encodeRlp, keccak256, concat, toBeArray } from 'ethers';

import { chainId } from '@backend/config';
import { asserts, computeHash, jsonReplacer, now, toHex } from '@backend/helpers/utils';
import { Block } from './block';
import { predictContractAddress } from './account';

import type { AccountAddress } from '@backend/types/account.types';
import type { TransactionData, TransactionHash, TransactionInstruction, TransactionInstructionExecute, TransactionInstructionCreate, TransactionInstructionMint, TransactionInstructionTransfer, TransactionReceiptData, TransactionReceiptRpc, TransactionRpc } from '@backend/types/transaction.types';
import type { BlockHash } from '@backend/types/block.types';


/* ######################################################### */


export class Transaction {
    public from: AccountAddress;
    public hash: TransactionHash | null = null;
    public amount: bigint;
    public instructions: TransactionInstruction[] = [];
    public nonce: bigint | null;
    public blockHeight: number | null = null;
    public blockHash: BlockHash | null = null;
    public transactionIndex: number | null = null;
    public contractAddress: AccountAddress | null = null;


    constructor(from: AccountAddress, amount: bigint = 0n, nonce?: bigint | null) {
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


    public create(code: string, contractClass: string, contructorArgs?: string[], amount = 0n): this {
        asserts(this.nonce, `[Transaction][create] missing transaction nonce`);
        const contractAddress: AccountAddress = predictContractAddress(this.from, this.nonce)
        console.log(`[${now()}][Transaction][create] Adresse du contrat à créer :`, contractAddress);

        const instruction: TransactionInstructionCreate = {
            type: 'create',
            contractAddress,
            contractClass,
            code,
            contructorArgs: contructorArgs ?? [],
            amount,
        };

        this.instructions.push(instruction);

        return this;
    }


    public execute(contractAddress: AccountAddress, className: string, methodName: string, args: any[] = [], amount = 0n): this {
        const instruction: TransactionInstructionExecute = {
            type: 'execute',
            contractAddress,
            className,
            methodName,
            methodArgs: args,
            amount,
        };

        this.instructions.push(instruction);

        return this;
    }


    toData(): TransactionData {
        const tx: Transaction = this;

        asserts(tx.nonce === null || ['bigint', 'undefined'].includes(typeof tx.nonce), `[Transaction][toData] invalid transaction nonce "${tx.nonce}"`);
        asserts(typeof tx.from === 'string', `[Transaction][toData] invalid transaction emitter type "${tx.from}"`);
        asserts(tx.from.startsWith('0x'), `[Transaction][toData] invalid transaction emitter "${tx.nonce}"`);
        asserts(tx.from.length === 42, `[Transaction][toData] invalid transaction emitter "${tx.nonce}"`);

        const transactionData: TransactionData = {
            from: tx.from,
            nonce: tx.nonce ?? undefined,
            value: tx.amount,
            instructions: tx.instructions,
            hash: tx.hash,
            transactionIndex: tx.transactionIndex,
            blockHash: tx.blockHash,
            blockHeight: tx.blockHeight,
            //to: tx.to ?? null,
            //gasPrice: 0n,
            //gasLimit: 0n,
        };


        return transactionData;
    }


    toJSON(): string {
        return JSON.stringify(this.toData(), jsonReplacer, 4);
    }


    static formatForRpc(tx: Transaction): TransactionRpc {
        // Doc: https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_gettransactionbyhash/

        //asserts(tx.blockHash, `[Transaction.formatForRpc] missing block hash`);
        //asserts(tx.hash, `[Transaction.formatForRpc] missing transaction hash`);

        const to: AccountAddress | null = tx.instructions.filter(instruction => instruction.type === 'transfer').at(0)?.recipient
            ?? tx.instructions.filter(instruction => instruction.type === 'mint').at(0)?.address
            ?? null;
        //asserts(to, `[Transaction.formatForRpc] invalid recipient`);

        const transactionRpc: TransactionRpc = {
            accessList: [],
            blockHash: tx.blockHash ?? null,
            blockNumber: tx.blockHeight === null ? null : toHex(tx.blockHeight),
            chainId: toHex(chainId),
            from: tx.from,
            gas: "0x01",
            gasPrice: "0x02",
            hash: tx.hash ?? null,
            input: "0x03",
            maxFeePerGas: "0x04",
            maxPriorityFeePerGas: "0x05",
            nonce: toHex(tx.nonce ?? 0),
            r: "0x6",
            s: "0x7",
            to: to,
            transactionIndex: tx.transactionIndex === null ? null : toHex(tx.transactionIndex),
            type: "0x2",
            v: "0x1",
            value: toHex(tx.amount),
            //yParity: "0x1",
        };

        return transactionRpc;
    }


    computeHash(): TransactionHash {
        // Récupérer les données de la transaction formatées pour RPC
        const txData = Transaction.formatForRpc(this);
        //const txData = this.toData();

        // Déterminer le type de transaction (0=legacy, 1=EIP-2930, 2=EIP-1559, 3=EIP-4844)
        const type = txData.type ? parseInt(txData.type.substring(2), 16) : 0;

        // Construire les champs à encoder en RLP selon le type de transaction
        let fields = [];
        let encodedTx;

        if (type === 0) {
            // Transaction legacy
            fields = [
                toBeArray(txData.nonce ? BigInt(txData.nonce) : 0n),
                toBeArray(txData.gasPrice ? BigInt(txData.gasPrice) : 0n),
                toBeArray(txData.gas ? BigInt(txData.gas) : 0n),
                txData.to || '0x',
                toBeArray(txData.value ? BigInt(txData.value) : 0n),
                txData.input || '0x',
            ];

            // Ajouter les champs de signature si présents
            if (txData.v && txData.r && txData.s) {
                fields.push(toBeArray(BigInt(txData.v)));
                fields.push(toBeArray(BigInt(txData.r)));
                fields.push(toBeArray(BigInt(txData.s)));
            } else {
                // Ajouter chainId pour les transactions non signées (EIP-155)
                const chainId = txData.chainId ? BigInt(txData.chainId) : 0n;
                if (chainId !== 0n) {
                    fields.push(toBeArray(chainId));
                    fields.push('0x');
                    fields.push('0x');
                }
            }

            // Encoder en RLP
            encodedTx = encodeRlp(fields);

        } else {
            // Transactions EIP-2718 (typed transactions)
            if (type === 1) {
                // EIP-2930 (Berlin)
                fields = [
                    toBeArray(BigInt(txData.chainId || '0x1')),
                    toBeArray(BigInt(txData.nonce || '0x0')),
                    toBeArray(BigInt(txData.gasPrice || '0x0')),
                    toBeArray(BigInt(txData.gas || '0x0')),
                    txData.to || '0x',
                    toBeArray(BigInt(txData.value || '0x0')),
                    txData.input || '0x',
                    txData.accessList || []
                ];

                if (txData.v && txData.r && txData.s) {
                    fields.push(toBeArray(BigInt(txData.v) % 2n)); // yParity
                    fields.push(toBeArray(BigInt(txData.r)));
                    fields.push(toBeArray(BigInt(txData.s)));
                }

                // Encoder avec le type
                encodedTx = concat(['0x01', encodeRlp(fields)]);

            } else if (type === 2) {
                // EIP-1559 (London)
                fields = [
                    toBeArray(BigInt(txData.chainId || '0x1')),
                    toBeArray(BigInt(txData.nonce || '0x0')),
                    toBeArray(BigInt(txData.maxPriorityFeePerGas || '0x0')),
                    toBeArray(BigInt(txData.maxFeePerGas || '0x0')),
                    toBeArray(BigInt(txData.gas || '0x0')),
                    txData.to || '0x',
                    toBeArray(BigInt(txData.value || '0x0')),
                    txData.input || '0x',
                    txData.accessList || []
                ];

                if (txData.v && txData.r && txData.s) {
                    fields.push(toBeArray(BigInt(txData.v) % 2n)); // yParity
                    fields.push(toBeArray(BigInt(txData.r)));
                    fields.push(toBeArray(BigInt(txData.s)));
                }

                // Encoder avec le type
                encodedTx = concat(['0x02', encodeRlp(fields)]);

            } else {
                // Type non supporté, retour à la méthode d'origine
                const transactionFormatted: TransactionData = this.toData();
                delete transactionFormatted.transactionIndex;
                delete transactionFormatted.blockHash;
                delete transactionFormatted.blockHeight;
                return this.computeHash_OLD();
            }
        }

        // Calculer le hash avec keccak256
        const transactionHash: TransactionHash = keccak256(encodedTx) as TransactionHash;

        // Éventuellement, enregistrer les données de débogage
        if (fs.existsSync('/tmp/blockchain-js-debug')) {
            const debugFile = `/tmp/blockchain-js-debug/tx-${Date.now()}-${transactionHash}.json`;
            fs.writeFileSync(debugFile, JSON.stringify({
                original: this.toData(),
                formatted: txData,
                type,
                encodedFields: fields.map(f => typeof f === 'string' ? f : '0x' + Buffer.from(f).toString('hex')),
                encodedTx,
                resultHash: transactionHash
            }, jsonReplacer, 4));
        }

        return transactionHash;
    }


    computeHash_OLD(): TransactionHash {
        const transactionFormatted: TransactionData = this.toData();

        delete transactionFormatted.transactionIndex;
        delete transactionFormatted.blockHash;
        delete transactionFormatted.blockHeight;

        const transactionHash: TransactionHash = computeHash(transactionFormatted);

        if (true && fs.existsSync('/tmp/blockchain-js-debug')) {
            // DEBUG
            const debugFile = `/tmp/blockchain-js-debug/tx-${Date.now()}-${transactionHash}.json`;
            fs.writeFileSync(debugFile, JSON.stringify(transactionFormatted, jsonReplacer, 4));
        }

        return transactionHash;
    }

}



