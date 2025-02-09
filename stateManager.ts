// stateManager.ts

import fs from 'fs';
import path from 'path';

import { Block, Blockchain } from './blockchain';
import { Account } from './account';
import { asserts, computeHash, ensureDirectory } from './utils';
import { ACCOUNTS_DIR, BLOCKS_DIR, decimals, fullcoin, STATE_DIR } from './config';

import type { AccountAddress, AccountData, AccountHash, Accounts, AccountsIndex, BlockchainMetadata, BlockData, BlockHash, Blocks, BlocksIndex, ContractMemory, HexNumber } from './types';


/* ######################################################### */

const BLOCKS_INDEX_FILE = path.join(STATE_DIR, 'blocksIndex.json');
const ACCOUNTS_INDEX_FILE = path.join(STATE_DIR, 'accountsIndex.json');
const METADATA_FILE = path.join(STATE_DIR, 'metadata.json');

const emptyBlocksHash = "0x44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";
const emptyAccountsHash = "0x44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";

/* ######################################################### */


export class StateManager {
    public blockchain: Blockchain;
    public accountsHash: HexNumber = '0x';
    public blocksHash: HexNumber = '0x';
    public lastBlockHash: HexNumber = '0x';
    public blocksIndex: BlocksIndex = []; // Tableau où l’index représente `blockHeight` et la valeur est `blockHash`
    public accountsIndex: AccountsIndex = {}; // Tableau où l’index représente `address` et la valeur est `accountHash`


    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;

        ensureDirectory(BLOCKS_DIR);
        ensureDirectory(ACCOUNTS_DIR);
    }


    /** 📥 Charge l'état général et vérifie l'intégrité */
    loadMetadata(): BlockchainMetadata {
        console.log(`[StateManager.loadMetadata]`);

        if (!fs.existsSync(METADATA_FILE)) {
            console.warn("⚠️ Aucun état trouvé, démarrage avec un blockchain vide.");

            const metadata: BlockchainMetadata = {
                totalAccounts: 0,
                totalBlocks: 0,
                blocksHash: emptyBlocksHash,
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
        asserts(typeof metadata.lastBlockHash === 'string', `metadata corrupted. invalid lastBlockHash. found: ${metadata.lastBlockHash}`);
        asserts(typeof metadata.totalAccounts === 'number', `metadata corrupted. invalid totalAccounts. found: ${metadata.totalAccounts}`);
        asserts(typeof metadata.totalBlocks === 'number', `metadata corrupted. invalid totalBlocks. found: ${metadata.totalBlocks}`);

        return metadata;
    }


    /** 📥 Sauvegarde l'état général */
    saveMetadata(): void {
        console.log(`[StateManager.saveMetadata]`);

        const metadata: BlockchainMetadata = {
            totalAccounts: Object.keys(this.accountsIndex).length, // fs.readdirSync(ACCOUNTS_DIR).length,
            totalBlocks: this.blocksIndex.length, // fs.readdirSync(BLOCKS_DIR).length,
            blocksHash: this.blocksHash,
            accountsHash: this.accountsHash,
            lastBlockHash: this.lastBlockHash,
            totalSupply: this.blockchain.totalSupply,
        };

        const metadataJson = JSON.stringify(metadata, jsonReplacerForSaveMetadata, 4);
        fs.writeFileSync(METADATA_FILE, metadataJson);

        console.log("[StateManager.saveMetadata] Metadata sauvegardée !");
    }



    /** 🔄 Charge l'index des blocks */
    loadBlocksIndex(): number {
        console.log(`[StateManager.loadBlocksIndex]`);

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
        console.log(`[StateManager.saveBlocksIndex]`);

        fs.writeFileSync(BLOCKS_INDEX_FILE, JSON.stringify(this.blocksIndex, null, 4));
    }


    /** 📤 Charge un block et vérifie son intégrité */
    loadBlock(blockHeight: number): Block | null {
        console.log(`[StateManager.loadBlock]`, blockHeight);

        const blockPath = path.join(BLOCKS_DIR, `${blockHeight}.json`);
        if (!fs.existsSync(blockPath)) return null;

        const raw = fs.readFileSync(blockPath, 'utf-8');
        const blockData: BlockData = JSON.parse(raw, jsonReviverForLoadBlock);

        const block = new Block(blockData.blockHeight, blockData.parentBlockHash);
        Object.assign(block, blockData);

        return block;
    }


    /** 📥 Sauvegarde un block et met à jour le hash incrémental */
    saveBlock(block: Block): void {
        console.log(`[StateManager.saveBlock]`, block.blockHeight);

        const blockPath = path.join(BLOCKS_DIR, `${block.blockHeight}.json`);

        // Sauvegarde du block
        const blockData = Block.format(block);
        fs.writeFileSync(blockPath, JSON.stringify(blockData, jsonReplacerForSaveBlock, 4));
    }



    /** 🔄 Charge l'index des accounts */
    loadAccountsIndex(): number {
        console.log(`[StateManager.loadAccountsIndex]`);

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
        console.log(`[StateManager.saveAccountsIndex]`);

        fs.writeFileSync(ACCOUNTS_INDEX_FILE, JSON.stringify(this.accountsIndex, null, 4));
    }


    /** 📤 Charge un compte et vérifie son intégrité */
    loadAccount(address: AccountAddress): Account | null {
        console.log(`[StateManager.loadAccount]`, address);

        const accountPath = path.join(ACCOUNTS_DIR, `${address}.json`);
        if (!fs.existsSync(accountPath)) return null;

        const raw = fs.readFileSync(accountPath, 'utf-8');
        const accountData = JSON.parse(raw, jsonReviverForLoadAccount);


        return new Account(
            address,
            BigInt(accountData.balance),
            accountData.abi,
            accountData.code,
            accountData.transactionsCount,
            accountData.memory,
            accountData.hash,
        );
    }


    /** 📥 Sauvegarde un compte et met à jour le hash incrémental */
    saveAccount(account: Account): void {
        console.log(`[StateManager.saveAccount]`, account.address);

        const accountPath = path.join(ACCOUNTS_DIR, `${account.address}.json`);

        // Sauvegarde du compte sur le disque
        const accountData: AccountData = Account.format(account);
        fs.writeFileSync(accountPath, JSON.stringify(accountData, jsonReplacerForSaveAccount, 4));
    }

}





export class MemoryState {
    public accounts: Accounts = {};
    public blocks: Blocks = {};


    dumpAccountsBalances(asFullCoin = false): { [address: string]: bigint | string } {
        return Object.fromEntries(
            Object.keys(this.accounts).map(address => {
                return asFullCoin
                    ? [address, Number(this.accounts[address].balance / fullcoin).toFixed(decimals)] // Approximatif (division entiere)
                    : [address, this.accounts[address].balance];
            })
        );
    }


    dumpAccountsMemories(): { [address: string]: ContractMemory | null } {
        return Object.fromEntries(
            Object.keys(this.accounts).map(address => [address, this.accounts[address].memory])
        );
    }


    dumpAccountsState() {
        const entries = Object.entries(this.accounts);
        const state: { [address: string]: any } = {};

        for (const entry of entries) {
            const [address, account] = entry;

            state[address] = {
                balance: account.balance,
                abi: account.abi,
                memory: account.memory,
                transactionsCount: account.transactionsCount,
            }
        }

        return state;
    }

}




const jsonReplacerForSaveMetadata = function (key: string, value: any): any {
    if (typeof value === 'bigint') {
        return { _jsonReplace: true, type: 'bigint', value: value.toString() };
    }

    return value;
}


const jsonReviverForLoadMetadata = (key: string, value: any) => value;


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




