// stateManager.ts

import fs from 'fs';
import path from 'path';

import { ACCOUNTS_DIR, ACCOUNTS_INDEX_FILE, BLOCKS_DIR, BLOCKS_INDEX_FILE, METADATA_FILE, TRANSACTIONS_INDEX_FILE } from './config';
import { asserts, dumpAccountsBalances, dumpAccountsMemories, dumpBlocks, ensureDirectory, now } from './utils';
import { Blockchain } from './blockchain';
import { Block } from './block';
import { Account } from './account';

import type { HexNumber } from './types/types';
import type { AccountAddress, AccountData, AccountHash, Accounts, AccountsIndex, ContractMemory } from './types/account.types';
import type { BlockData, BlockHash, Blocks, BlocksIndex } from './types/block.types';
import type { BlockchainMetadata } from './types/blockchain.types';
import { TransactionsIndex } from './types/transaction.types';


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
    public transactionsIndex: TransactionsIndex = {}; // Tableau où l’index représente `transactionHash` et la valeur est `blockHeight`


    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;

        ensureDirectory(BLOCKS_DIR);
        ensureDirectory(ACCOUNTS_DIR);
    }


    /** 📥 Charge l'état général et vérifie l'intégrité */
    loadMetadata(): BlockchainMetadata {
        console.log(`[${now()}][StateManager.loadMetadata]`);

        if (!fs.existsSync(METADATA_FILE)) {
            console.warn("⚠️ Aucun état trouvé, démarrage avec un blockchain vide.");

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

        const metadataJson = fs.readFileSync(METADATA_FILE, 'utf-8');
        const metadata: BlockchainMetadata = JSON.parse(metadataJson, jsonReviverForLoadMetadata);

        asserts(typeof metadata.blocksHash === 'string', `metadata corrupted. invalid blocksHash. found: ${metadata.blocksHash}`);
        asserts(typeof metadata.accountsHash === 'string', `metadata corrupted. invalid accountsHash. found: ${metadata.accountsHash}`);
        asserts(typeof metadata.transactionsHash === 'string', `metadata corrupted. invalid transactionsHash. found: ${metadata.transactionsHash}`);
        asserts(typeof metadata.lastBlockHash === 'string', `metadata corrupted. invalid lastBlockHash. found: ${metadata.lastBlockHash}`);
        asserts(typeof metadata.totalAccounts === 'number', `metadata corrupted. invalid totalAccounts. found: ${metadata.totalAccounts}`);
        asserts(typeof metadata.totalBlocks === 'number', `metadata corrupted. invalid totalBlocks. found: ${metadata.totalBlocks}`);
        asserts(typeof metadata.totalTransactions === 'number', `metadata corrupted. invalid totalTransactions. found: ${metadata.totalTransactions}`);

        return metadata;
    }


    /** 📥 Sauvegarde l'état général */
    saveMetadata(): void {
        console.log(`[${now()}][StateManager.saveMetadata]`);

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

        const metadataJson = JSON.stringify(metadata, jsonReplacerForSaveMetadata, 4);
        fs.writeFileSync(METADATA_FILE, metadataJson);

        console.log("[StateManager.saveMetadata] Metadata sauvegardée !");
    }



    /** 🔄 Charge l'index des blocks */
    loadBlocksIndex(): number {
        console.log(`[${now()}][StateManager.loadBlocksIndex]`);

        if (fs.existsSync(BLOCKS_INDEX_FILE)) {
            const blocksIndex = fs.readFileSync(BLOCKS_INDEX_FILE).toString();
            this.blocksIndex = JSON.parse(blocksIndex) as BlocksIndex;

        } else {
            this.blocksIndex = []; // Initialisation vide
        }

        return this.blocksIndex.length;
    }


    /** 💾 Sauvegarde l’index des blocks */
    saveBlocksIndex(): void {
        console.log(`[${now()}][StateManager.saveBlocksIndex]`);

        fs.writeFileSync(BLOCKS_INDEX_FILE, JSON.stringify(this.blocksIndex, null, 4));
    }



    /** 🔄 Charge l'index des transactions */
    loadTransactionsIndex(): number {
        console.log(`[${now()}][StateManager.loadTransactionsIndex]`);

        if (fs.existsSync(TRANSACTIONS_INDEX_FILE)) {
            const transactionsIndex = fs.readFileSync(TRANSACTIONS_INDEX_FILE).toString();
            this.transactionsIndex = JSON.parse(transactionsIndex) as TransactionsIndex;

        } else {
            this.transactionsIndex = {}; // Initialisation vide
        }

        return Object.keys(this.transactionsIndex).length;
    }


    /** 💾 Sauvegarde l’index des transactions */
    saveTransactionsIndex(): void {
        console.log(`[${now()}][StateManager.saveTransactionsIndex]`);

        fs.writeFileSync(TRANSACTIONS_INDEX_FILE, JSON.stringify(this.transactionsIndex, null, 4));
    }



    /** 📤 Charge un block et vérifie son intégrité */
    loadBlock(blockHeight: number): Block | null {
        console.log(`[${now()}][StateManager.loadBlock]`, blockHeight);

        const blockPath = path.join(BLOCKS_DIR, `${blockHeight.toString().padStart(15, '0')}.json`);
        asserts(fs.existsSync(blockPath), `block "${blockHeight}" not found in database`);
        //if (!fs.existsSync(blockPath)) return null;

        const raw = fs.readFileSync(blockPath, 'utf-8');
        const blockData: BlockData = JSON.parse(raw, jsonReviverForLoadBlock);

        const blockHash = this.blocksIndex[blockHeight];
        asserts(blockHash, `block "${blockHeight}" not found in blocksIndex`);

        const block = new Block(blockData.blockHeight, blockData.parentBlockHash);
        Object.assign(block, blockData);

        // Vérifier la présence du champ `hash`
        if (!block.hash) {
            console.warn(`⚠️ Block ${blockHeight} ne contient pas de hash`);
            throw new Error(`⚠️ Block ${blockHeight} ne contient pas de hash`);
        }

        if (block.hash !== blockHash) {
            console.warn(`⚠️ Block ${blockHeight} contient un hash incoherent. (Expected: "${blockHash}" / Found: "${block.hash}")`);
            throw new Error(`⚠️ Block ${blockHeight} contient un hash incoherent. (Expected: "${blockHash}" / Found: "${block.hash}")`);
        }

        // Vérifier l'intégrité du block
        const expectedHash: BlockHash = block.computeHash();

        if (expectedHash !== blockHash) {
            debugger;
            console.warn(`⚠️ Intégrité compromise pour le block ${blockHeight}. (Expected: "${blockHash}" / Found: "${expectedHash}")`);
            throw new Error(`[Blockchain.getBlock] invalid block hash`);
        }

        return block;
    }


    /** 📥 Sauvegarde un block et met à jour le hash incrémental */
    saveBlock(block: Block): void {
        console.log(`[${now()}][StateManager.saveBlock]`, block.blockHeight);

        const blockPath = path.join(BLOCKS_DIR, `${block.blockHeight.toString().padStart(15, '0')}.json`);

        // Sauvegarde du block
        const blockData = Block.toJSON(block);
        fs.writeFileSync(blockPath, JSON.stringify(blockData, jsonReplacerForSaveBlock, 4));
    }



    /** 🔄 Charge l'index des accounts */
    loadAccountsIndex(): number {
        console.log(`[${now()}][StateManager.loadAccountsIndex]`);

        if (fs.existsSync(ACCOUNTS_INDEX_FILE)) {
            const accountsIndex = fs.readFileSync(ACCOUNTS_INDEX_FILE).toString();
            this.accountsIndex = JSON.parse(accountsIndex) as AccountsIndex;

        } else {
            this.accountsIndex = {}; // Initialisation vide
        }

        return Object.keys(this.accountsIndex).length;
    }


    /** 💾 Sauvegarde l’index des accounts */
    saveAccountsIndex(): void {
        console.log(`[${now()}][StateManager.saveAccountsIndex]`);

        fs.writeFileSync(ACCOUNTS_INDEX_FILE, JSON.stringify(this.accountsIndex, null, 4));
    }


    /** 📤 Charge un compte et vérifie son intégrité */
    loadAccount(address: AccountAddress): Account | null {
        console.log(`[${now()}][StateManager.loadAccount]`, address);

        const addressLower = address.toLowerCase() as AccountAddress;

        const accountPath = path.join(ACCOUNTS_DIR, `${addressLower}.json`);
        asserts(fs.existsSync(accountPath), `address "${address}" not found in database`);
        //if (!fs.existsSync(accountPath)) return null;

        const raw = fs.readFileSync(accountPath, 'utf-8');
        const accountData: AccountData = JSON.parse(raw, jsonReviverForLoadAccount);

        const accountHash = this.accountsIndex[addressLower];
        asserts(accountHash, `address "${address}" not found in accountsIndex`);

        const account = new Account(
            accountData.address,
            accountData.balance,
            accountData.abi,
            accountData.code,
            accountData.transactionsCount,
            accountData.memory,
            accountData.hash,
        );

        // Vérifier l'intégrité du compte
        const expectedHash: AccountHash = account.computeHash();

        if (expectedHash !== accountHash) {
            console.warn(`⚠️ Intégrité compromise pour le compte ${address}. Expected: "${expectedHash}" / Found: "${accountHash}"`);
            debugger;
            throw new Error(`[Blockchain.getAccount] invalid account hash`);
        }

        return account;
    }


    /** 📥 Sauvegarde un compte et met à jour le hash incrémental */
    saveAccount(account: Account): void {
        console.log(`[${now()}][StateManager.saveAccount]`, account.address);

        const accountPath = path.join(ACCOUNTS_DIR, `${account.address.toLowerCase()}.json`);

        // Sauvegarde du compte sur le disque
        const accountData: AccountData = Account.toJSON(account);
        fs.writeFileSync(accountPath, JSON.stringify(accountData, jsonReplacerForSaveAccount, 4));
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
            const account: Account = this.blockchain.getAccount(address as AccountAddress);
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
    public accounts: Accounts = {};
    public blocks: Blocks = {};


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




const jsonReplacerForSaveMetadata = function (key: string, value: any): any {
    if (typeof value === 'bigint') {
        return { _jsonReplace: true, type: 'bigint', value: value.toString() };
    }

    return value;
}


const jsonReviverForLoadMetadata = function (key: string, value: any): any {
    if (typeof value === 'object' && value && value._jsonReplace && value.type === 'bigint') {
        return BigInt(value.value);
    }

    return value;
}


const jsonReplacerForSaveBlock = function (key: string, value: any): any {
    if (typeof value === 'bigint') {
        return { _jsonReplace: true, type: 'bigint', value: value.toString() };
    }

    return value;
}


const jsonReviverForLoadBlock = function (key: string, value: any): any {
    if (typeof value === 'object' && value && value._jsonReplace && value.type === 'bigint') {
        return BigInt(value.value);
    }

    return value;
}


const jsonReplacerForSaveAccount = function (key: string, value: any): any {
    if (typeof value === 'bigint') {
        return { _jsonReplace: true, type: 'bigint', value: value.toString() };
    }

    return value;
}


const jsonReviverForLoadAccount = function (key: string, value: any): any {
    if (typeof value === 'object' && value && value._jsonReplace && value.type === 'bigint') {
        return BigInt(value.value);
    }

    return value;
}




