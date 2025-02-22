// stateManager.ts

import fs from 'fs';
import path from 'path';

import { decimals, fullcoin } from '@backend/config';
import { asserts, divideBigInt, ensureDirectory, jsonReplacer, jsonReviver, now } from '@backend/helpers/utils';
import { Blockchain } from './blockchain';
import { Block } from './block';
import { Account } from './account';
import { Transaction } from './transaction';

import type { HexNumber } from '@backend/types/types';
import type { AccountAddress, AccountData, AccountHash, Accounts, AccountsIndex, ContractMemory } from '@backend/types/account.types';
import type { BlockData, BlockHash, Blocks, BlocksIndex } from '@backend/types/block.types';
import type { BlockchainMetadata } from '@backend/types/blockchain.types';
import type { TransactionData, TransactionHash, TransactionReceiptData, Transactions, TransactionsIndex, TransactionsReceipts } from '@backend/types/transaction.types';
import { TransactionReceipt } from './receipt';


/* ######################################################### */

const emptyBlocksHash = "0x44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";
const emptyAccountsHash = "0x44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";
const emptyTransactionsHash = "0x44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";

/* ######################################################### */


export class StateManager {
    public blockchain: Blockchain;
    public accountsHash: HexNumber = '0x';
    public blocksHash: HexNumber = '0x';
    public transactionsHash: HexNumber = '0x';
    public lastBlockHash: HexNumber = '0x';
    public blocksIndex: BlocksIndex = []; // Tableau où l’index représente `blockHeight` et la valeur est `blockHash`
    public accountsIndex: AccountsIndex = {}; // Tableau où l’index représente `address` et la valeur est `accountHash`
    public transactionsIndex: TransactionsIndex = {}; // Tableau où l’index représente `txHash` et la valeur est `blockHeight`
    public paths: Record<string, string> = {};


    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;

        this.paths.BLOCKS_DIR = path.join(blockchain.stateDir, 'blocks');
        this.paths.ACCOUNTS_DIR = path.join(blockchain.stateDir, 'accounts');
        this.paths.TRANSACTIONS_DIR = path.join(blockchain.stateDir, 'transactions');
        this.paths.RECEIPTS_DIR = path.join(blockchain.stateDir, 'receipts');
        this.paths.MEMPOOL_DIR = path.join(blockchain.stateDir, 'mempool');

        this.paths.METADATA_FILE = path.join(blockchain.stateDir, 'metadata.json');

        this.paths.BLOCKS_INDEX_FILE = path.join(blockchain.stateDir, 'blocksIndex.json');
        this.paths.ACCOUNTS_INDEX_FILE = path.join(blockchain.stateDir, 'accountsIndex.json');
        this.paths.TRANSACTIONS_INDEX_FILE = path.join(blockchain.stateDir, 'transactionsIndex.json');
        //this.paths.RECEIPTS_INDEX_FILE = path.join(blockchain.stateDir, 'receiptsIndex.json');

        ensureDirectory(this.paths.BLOCKS_DIR);
        ensureDirectory(this.paths.ACCOUNTS_DIR);
        ensureDirectory(this.paths.TRANSACTIONS_DIR);
        ensureDirectory(this.paths.RECEIPTS_DIR);
        ensureDirectory(this.paths.MEMPOOL_DIR);
    }


    /** Charge l'état général et vérifie l'intégrité */
    loadMetadata(): BlockchainMetadata {
        console.log(`[${now()}][State.loadMetadata]`);

        if (!fs.existsSync(this.paths.METADATA_FILE)) {
            console.warn(`[${now()}][State.loadMetadata] ⚠️ Aucun état trouvé, démarrage avec un blockchain vide.`);

            const metadata: BlockchainMetadata = {
                totalAccounts: 0,
                totalBlocks: 0,
                totalTransactions: 0,
                blocksHash: emptyBlocksHash,
                transactionsHash: emptyTransactionsHash,
                accountsHash: emptyAccountsHash,
                lastBlockHash: '0x',
                totalSupply: 0n,
            };

            return metadata;
        }

        const metadataJson = fs.readFileSync(this.paths.METADATA_FILE, 'utf-8');
        const metadata: BlockchainMetadata = JSON.parse(metadataJson, jsonReviver);

        asserts(typeof metadata.blocksHash === 'string', `metadata corrupted. invalid blocksHash. found: ${metadata.blocksHash}`);
        asserts(typeof metadata.accountsHash === 'string', `metadata corrupted. invalid accountsHash. found: ${metadata.accountsHash}`);
        asserts(typeof metadata.transactionsHash === 'string', `metadata corrupted. invalid transactionsHash. found: ${metadata.transactionsHash}`);
        asserts(typeof metadata.lastBlockHash === 'string', `metadata corrupted. invalid lastBlockHash. found: ${metadata.lastBlockHash}`);
        asserts(typeof metadata.totalAccounts === 'number', `metadata corrupted. invalid totalAccounts. found: ${metadata.totalAccounts}`);
        asserts(typeof metadata.totalBlocks === 'number', `metadata corrupted. invalid totalBlocks. found: ${metadata.totalBlocks}`);
        asserts(typeof metadata.totalTransactions === 'number', `metadata corrupted. invalid totalTransactions. found: ${metadata.totalTransactions}`);

        return metadata;
    }


    /** Sauvegarde l'état général */
    saveMetadata(): BlockchainMetadata {
        //console.log(`[${now()}][State.saveMetadata]`);

        const metadata: BlockchainMetadata = {
            totalAccounts: Object.keys(this.accountsIndex).length,
            totalBlocks: this.blocksIndex.length,
            totalTransactions: Object.keys(this.transactionsIndex).length,
            blocksHash: this.blocksHash,
            accountsHash: this.accountsHash,
            transactionsHash: this.transactionsHash,
            lastBlockHash: this.lastBlockHash,
            totalSupply: this.blockchain.totalSupply,
        };

        const metadataJson = JSON.stringify(metadata, jsonReplacer, 4);
        fs.writeFileSync(this.paths.METADATA_FILE, metadataJson);

        //console.log(`[${now()}][State.saveMetadata] Metadata sauvegardée !`);

        return metadata;
    }



    /** Charge l'index des blocks */
    loadBlocksIndex(): number {
        //console.log(`[${now()}][State.loadBlocksIndex]`);

        if (fs.existsSync(this.paths.BLOCKS_INDEX_FILE)) {
            const blocksIndex = fs.readFileSync(this.paths.BLOCKS_INDEX_FILE).toString();
            this.blocksIndex = JSON.parse(blocksIndex) as BlocksIndex;

        } else {
            this.blocksIndex = []; // Initialisation vide
        }

        return this.blocksIndex.length;
    }


    /** Sauvegarde l’index des blocks */
    saveBlocksIndex(): void {
        //console.log(`[${now()}][State.saveBlocksIndex]`);

        fs.writeFileSync(this.paths.BLOCKS_INDEX_FILE, JSON.stringify(this.blocksIndex, null, 4));
    }



    /** Charge l'index des transactions */
    loadTransactionsIndex(): number {
        //console.log(`[${now()}][State.loadTransactionsIndex]`);

        if (fs.existsSync(this.paths.TRANSACTIONS_INDEX_FILE)) {
            const transactionsIndex = fs.readFileSync(this.paths.TRANSACTIONS_INDEX_FILE).toString();
            this.transactionsIndex = JSON.parse(transactionsIndex) as TransactionsIndex;

        } else {
            this.transactionsIndex = {}; // Initialisation vide
        }

        return Object.keys(this.transactionsIndex).length;
    }


    /** Sauvegarde l’index des transactions */
    saveTransactionsIndex(): void {
        //console.log(`[${now()}][State.saveTransactionsIndex]`);

        fs.writeFileSync(this.paths.TRANSACTIONS_INDEX_FILE, JSON.stringify(this.transactionsIndex, null, 4));
    }



    /** Charge un block et vérifie son intégrité */
    loadBlock(blockHeight: number): Block | null {
        //console.log(`[${now()}][State.loadBlock]`, blockHeight);

        // Vérification si le block est un block connu dans l'index
        const indexedBlockHash = this.blocksIndex[blockHeight];
        asserts(indexedBlockHash, `block "${blockHeight}" not found in blocksIndex`);


        // Charge le block depuis le disque
        const blockPath = path.join(this.paths.BLOCKS_DIR, `${blockHeight.toString().padStart(15, '0')}.json`);
        asserts(fs.existsSync(blockPath), `block "${blockHeight}" not found in database`);
        const raw = fs.readFileSync(blockPath, 'utf-8');

        // Parse le block encodé en JSON
        const blockData: BlockData = JSON.parse(raw, jsonReviver);


        // Création d'un nouvel objet Block
        const block = Block.from(blockData);


        // Vérifier la présence & cohérence du champ `hash`
        if (!block.hash) {
            console.warn(`[${now()}][State.loadBlock] ⚠️ Block ${blockHeight} ne contient pas de hash`);
            throw new Error(`[State.loadBlock] ⚠️ Block ${blockHeight} ne contient pas de hash`);
        }

        if (block.hash !== indexedBlockHash) {
            console.warn(`[${now()}][State.loadBlock] ⚠️ Block ${blockHeight} contient un hash incoherent. (Expected: "${indexedBlockHash}" / Found: "${block.hash}")`);
            throw new Error(`[State.loadBlock] ⚠️ Block ${blockHeight} contient un hash incoherent. (Expected: "${indexedBlockHash}" / Found: "${block.hash}")`);
        }


        // Vérifier l'intégrité du block
        const computedBlockHash: BlockHash = block.computeHash();

        if (computedBlockHash !== indexedBlockHash) {
            console.warn(`[${now()}][State.loadBlock] ⚠️ Intégrité compromise pour le block ${blockHeight}. (Expected: "${indexedBlockHash}" / Found: "${computedBlockHash}")`);
            throw new Error(`[State.loadBlock] invalid block hash`);
        }


        return block;
    }


    /** Sauvegarde un block et met à jour le hash incrémental */
    saveBlock(block: Block): void {
        //console.log(`[${now()}][State.saveBlock]`, block.blockHeight);

        const blockPath = path.join(this.paths.BLOCKS_DIR, `${block.blockHeight.toString().padStart(15, '0')}.json`);

        // Sauvegarde du block
        const blockJson: string = block.toJSON();
        fs.writeFileSync(blockPath, blockJson);
    }



    /** Charge l'index des accounts */
    loadAccountsIndex(): number {
        //console.log(`[${now()}][State.loadAccountsIndex]`);

        if (fs.existsSync(this.paths.ACCOUNTS_INDEX_FILE)) {
            const accountsIndex = fs.readFileSync(this.paths.ACCOUNTS_INDEX_FILE).toString();
            this.accountsIndex = JSON.parse(accountsIndex) as AccountsIndex;

        } else {
            this.accountsIndex = {}; // Initialisation vide
        }

        return Object.keys(this.accountsIndex).length;
    }


    /** Sauvegarde l’index des accounts */
    saveAccountsIndex(): void {
        //console.log(`[${now()}][State.saveAccountsIndex]`);

        fs.writeFileSync(this.paths.ACCOUNTS_INDEX_FILE, JSON.stringify(this.accountsIndex, null, 4));
    }


    /** Charge un compte et vérifie son intégrité */
    loadAccount(address: AccountAddress): Account | null {
        //console.log(`[${now()}][State.loadAccount]`, address);

        const addressLower = address.toLowerCase() as AccountAddress;

        const accountPath = path.join(this.paths.ACCOUNTS_DIR, `${addressLower}.json`);
        asserts(fs.existsSync(accountPath), `address "${address}" not found in database`);
        //if (!fs.existsSync(accountPath)) return null;

        // Charge le account depuis le disque
        const raw = fs.readFileSync(accountPath, 'utf-8');

        // Parse le account encodé en JSON
        const accountData: AccountData = JSON.parse(raw, jsonReviver);

        const accountHash = this.accountsIndex[addressLower];
        asserts(accountHash, `address "${address}" not found in accountsIndex`);

        //const account = new Account(
        //    accountData.address,
        //    accountData.balance,
        //    accountData.abi,
        //    accountData.code,
        //    accountData.transactionsCount,
        //    accountData.memory,
        //    accountData.hash,
        //);

        const account = Account.from(accountData);

        // Vérifier l'intégrité du compte
        const expectedHash: AccountHash = account.computeHash();

        if (expectedHash !== accountHash) {
            console.warn(`[${now()}]⚠️ Intégrité compromise pour le compte ${address}. Expected: "${expectedHash}" / Found: "${accountHash}"`);
            debugger;
            throw new Error(`[State.getAccount] invalid account hash`);
        }

        return account;
    }


    /** Sauvegarde un compte et met à jour le hash incrémental */
    saveAccount(account: Account): void {
        //console.log(`[${now()}][State.saveAccount]`, account.address);

        const accountPath = path.join(this.paths.ACCOUNTS_DIR, `${account.address.toLowerCase()}.json`);

        // Sauvegarde du compte sur le disque
        const accountJson: string = account.toJSON();
        fs.writeFileSync(accountPath, accountJson);
    }


    loadTransaction(txHash: TransactionHash): Transaction | null {
        //console.log(`[${now()}][State.loadTransaction]`, address);

        const txHashLower = txHash.toLowerCase() as TransactionHash;

        const transactionPath = path.join(this.paths.TRANSACTIONS_DIR, `${txHashLower}.json`);
        asserts(fs.existsSync(transactionPath), `transaction "${txHashLower}" not found in database`);
        //if (!fs.existsSync(transactionPath)) return null;

        // Charge la transaction depuis le disque
        const raw = fs.readFileSync(transactionPath, 'utf-8');

        // Parse la transaction encodée en JSON
        const txData: TransactionData = JSON.parse(raw, jsonReviver);


        // Création d'un nouvel objet Transaction
        const tx = Transaction.from(txData);

        const transactionChecksumHash = this.transactionsIndex[txHash];
        asserts(transactionChecksumHash, `transaction "${txHash}" not found in transactionsIndex`);

        const blockHeight: number = this.transactionsIndex[txHash];

        // Vérifier la présence & cohérence du champ `hash`
        if (!tx.hash) {
            console.warn(`[${now()}][State.loadTransaction] ⚠️ Transaction ${txHash} ne contient pas de hash`);
            throw new Error(`[State.loadTransaction] ⚠️ Transaction ${txHash} ne contient pas de hash`);
        }

        if (tx.hash !== txHash) {
            console.warn(`[${now()}][State.loadTransaction] ⚠️ Transaction ${txHash} contient un hash incoherent. (Expected: "${txHash}" / Found: "${tx.hash}")`);
            throw new Error(`[State.loadTransaction] ⚠️ Transaction ${txHash} contient un hash incoherent. (Expected: "${txHash}" / Found: "${tx.hash}")`);
        }


        // Vérifier l'intégrité de la transaction
        const computedTransactionHash: TransactionHash = tx.computeHash();

        if (computedTransactionHash !== txHash) {
            console.warn(`[${now()}][State.loadTransaction] ⚠️ Intégrité compromise pour la transaction ${txHash}. (Expected: "${txHash}" / Found: "${computedTransactionHash}")`);
            throw new Error(`[State.loadTransaction] invalid transaction hash`);
        }


        return tx;
    }


    saveTransaction(transaction: Transaction): void {
        //console.log(`[${now()}][State.saveTransaction]`, transaction.hash);
        asserts(transaction.hash, `[${now()}][State.saveTransaction] transaction has no hash`);

        const txHashLower = transaction.hash.toLowerCase() as TransactionHash;
        const transactionPath = path.join(this.paths.TRANSACTIONS_DIR, `${txHashLower.toLowerCase()}.json`);

        // Sauvegarde du compte sur le disque
        const transactionJson: string = transaction.toJSON();
        fs.writeFileSync(transactionPath, transactionJson);
    }


    loadTransactionReceipt(txHash: TransactionHash): TransactionReceipt | null {
        //console.log(`[${now()}][State.loadTransactionReceipt]`, address);

        const txHashLower = txHash.toLowerCase() as TransactionHash;

        const receiptPath = path.join(this.paths.RECEIPTS_DIR, `${txHashLower}.json`);
        asserts(fs.existsSync(receiptPath), `receipt "${txHashLower}" not found in database`);
        //if (!fs.existsSync(receiptPath)) return null;


        // Charge le receipt depuis le disque
        const raw = fs.readFileSync(receiptPath, 'utf-8');

        // Parse le receipt encodé en JSON
        const receiptData: TransactionReceiptData = JSON.parse(raw, jsonReviver);

        asserts(receiptData.transactionHash === txHash, `receipt hash mismatch`);


        // Création d'un nouvel objet Transaction
        const receipt = TransactionReceipt.from(receiptData);

        const transactionChecksumHash = this.transactionsIndex[txHash];
        asserts(transactionChecksumHash, `receipt "${txHash}" not found in transactionsIndex`);

        return receipt;
    }


    saveReceipt(receipt: TransactionReceipt): void {
        //console.log(`[${now()}][State.saveTransaction]`, transaction.hash);
        asserts(receipt.transactionHash, `[${now()}][State.saveTransaction] transaction has no hash`);

        const txHashLower = receipt.transactionHash.toLowerCase() as TransactionHash;
        const transactionPath = path.join(this.paths.RECEIPTS_DIR, `${txHashLower.toLowerCase()}.json`);

        // Sauvegarde du compte sur le disque
        const transactionJson: string = receipt.toJSON();
        fs.writeFileSync(transactionPath, transactionJson);
    }


    deleteMempoolTransaction(txHash: TransactionHash): void {
        //console.log(`[${now()}][State.deleteMempoolTransaction]`, txHash);

        const txPath = path.join(this.paths.MEMPOOL_DIR, `${txHash}.json`);

        if (fs.existsSync(txPath)) {
            fs.unlinkSync(txPath);
        }
    }

    dumpAccountsBalances(asFullCoin = false): { [address: string]: bigint | string } {
        const accounts: Accounts = Object.fromEntries(
            Array.from(this.getAccountsGenerator())
                .map(account => [account.address, account])
        );
        return dumpAccountsBalances(accounts, asFullCoin);
    }

    dumpAccountsMemories(): { [address: string]: ContractMemory | null } {
        const accounts: Accounts = Object.fromEntries(
            Array.from(this.getAccountsGenerator())
                .map(account => [account.address, account])
        );
        return dumpAccountsMemories(accounts);
    }


    dumpBlocks(): { [blockHeight: number]: BlockData } {
        const blocks: Blocks = Object.fromEntries(
            Array.from(this.getBlocksGenerator())
                .map(block => [block.blockHeight, block])
        )
        return dumpBlocks(blocks);
    }


    * getAccountsGenerator(): Generator<Account> {
        for (const address in this.accountsIndex) {
            const account: Account = this.blockchain.getAccount(address as AccountAddress, null);
            yield account;
        }
    }


    * getBlocksGenerator(): Generator<Block> {
        for (const key in Object.keys(this.blocksIndex)) {
            const blockHeight = Number(key);
            const block: Block | null = this.blockchain.getBlock(blockHeight);
            asserts(block, `block "${blockHeight}" not found`);
            yield block;
        }
    }
}





export class MemoryState {
    public accounts: Accounts = {}; // TODO: à remplacer par un Map ou un LRU
    public blocks: Blocks = {}; // TODO: à remplacer par un Map ou un LRU
    public transactions: Transactions = {}; // TODO: à remplacer par un Map ou un LRU
    public receipts: TransactionsReceipts = {}; // TODO: à remplacer par un Map ou un LRU


    dumpAccountsBalances(asFullCoin = false): { [address: string]: bigint | string } {
        return dumpAccountsBalances(this.accounts, asFullCoin);
    }

    dumpAccountsMemories(): { [address: string]: ContractMemory | null } {
        return dumpAccountsMemories(this.accounts);
    }

    dumpBlocks() {
        return dumpBlocks(this.blocks);
    }

}




export function dumpAccountsBalances(accounts: Accounts, asFullCoin = false): { [address: string]: bigint | string } {
    return Object.fromEntries(
        Object.keys(accounts)
            .map(address => {
                return asFullCoin
                    ? [address, divideBigInt(accounts[address].balance, fullcoin).toFixed(decimals)]
                    : [address, accounts[address].balance];
            })
    );
}


export function dumpAccountsMemories(accounts: Accounts): { [address: string]: ContractMemory | null } {
    return Object.fromEntries(
        Object.keys(accounts)
            .map(address => [address, accounts[address].memory])
    );
}


export function dumpBlocks(blocks: Blocks): { [blockHeight: number]: BlockData } {
    return Object.fromEntries(
        Object.keys(blocks)
            .map((blockHeightAsStr: string) => [Number(blockHeightAsStr), blocks[Number(blockHeightAsStr)].toData()])
    );
}


