// blockchain.ts

import http from 'http';

import { blockMaxTransactions, blockMinTransactions, blockReward, chainId, genesisTimestamp, networkVersion } from './config';
import { asserts, computeHash, now } from './utils';
import { StateManager } from './stateManager';
import { Transaction } from './transaction';
import { Account } from './account';
import { MemoryState } from './stateManager';
import { Mempool } from './mempool';
import { Block } from './block';
import { P2PNode } from './p2p';
import { BlocksMiner } from './miner';

import type { TransactionHash, TransactionReceipt } from './types/transaction.types';
import type { BlockHash, BlockReceipt } from './types/block.types';
import type { AccountAddress } from './types/account.types';



/* ######################################################### */


export class Blockchain {
    public memoryState: MemoryState;
    public stateManager: StateManager;
    public mempool: Mempool = new Mempool(this);
    public totalSupply: bigint = 0n;
    public stateDir: string;
    public p2p: P2PNode | null = null;
    public miner: BlocksMiner | null = null;
    public rpc: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | null = null;


    constructor(stateDir: string='~/.blockchain-js') {
        this.stateDir = stateDir;
        this.memoryState = new MemoryState;
        this.stateManager = new StateManager(this);

        this.loadBlockchain();
    }


    /** 📤 Charge les blocks depuis le stockage */
    loadBlockchain() {
        console.log(`[${now()}][Chain.loadBlockchain]`);

        const metadata = this.stateManager.loadMetadata();

        this.stateManager.blocksHash = metadata.blocksHash;
        this.stateManager.accountsHash = metadata.accountsHash;
        this.stateManager.transactionsHash = metadata.transactionsHash;
        this.stateManager.lastBlockHash = metadata.lastBlockHash;
        this.totalSupply = metadata.totalSupply;


        // Vérifier la cohérence du nb de blocks
        const totalBlocks = this.stateManager.loadBlocksIndex();

        if (metadata?.totalBlocks !== totalBlocks) {
            console.warn(`⚠️ Le nombre de blocks a été modifié ! (expected: "${metadata?.totalBlocks}" found: "${totalBlocks}")`);
        }


        // Vérifier la cohérence du nb de transactions
        const totalTransactions = this.stateManager.loadTransactionsIndex();

        if (metadata?.totalTransactions !== totalTransactions) {
            console.warn(`⚠️ Le nombre de transactions a été modifié ! (expected: "${metadata?.totalTransactions}" found: "${totalTransactions}")`);
        }


        // Vérifier la cohérence du hash blocks
        const transactionsHash = computeHash(this.stateManager.transactionsIndex);

        if (transactionsHash !== this.stateManager.transactionsHash) {
            console.warn(`⚠️ Le transactionsHash a été modifié ! (expected: "${transactionsHash}" found: "${this.stateManager.transactionsHash}")`);
            debugger;
        }


        // Vérifier la cohérence du nb d'accounts
        const totalAccounts = this.stateManager.loadAccountsIndex();

        if (metadata?.totalAccounts !== totalAccounts) {
            console.warn(`⚠️ Le nombre de accounts a été modifié ! (expected: "${metadata?.totalAccounts}" found: "${totalAccounts}")`);
        }


        // Vérifier la cohérence du hash blocks
        const blocksHash = computeHash(this.stateManager.blocksIndex);

        if (blocksHash !== this.stateManager.blocksHash) {
            console.warn(`⚠️ Le blocksHash a été modifié ! (expected: "${blocksHash}" found: "${this.stateManager.blocksHash}")`);
            debugger;
        }


        // Vérifier la cohérence du hash accounts
        const accountsHash = computeHash(this.stateManager.accountsIndex);

        if (accountsHash !== this.stateManager.accountsHash) {
            console.warn(`⚠️ Le accountsHash a été modifié ! (expected: "${accountsHash}" found: "${this.stateManager.accountsHash}")`);
            debugger;
        }


        console.log(`[${now()}]Blockchain chargée : ${metadata.totalBlocks} blocks, ${metadata.totalAccounts} comptes.`);
    }


    getChainId(): number {
        return chainId;
    }


    getNetworkVersion(): number {
        return networkVersion;
    }


    /** 📤 Retourne le hash d’un block à partir de son height */
    getBlockHash(blockHeight: number): string | null {
        return this.stateManager.blocksIndex[blockHeight] ?? null;
    }


    getBlockHeight(blockHash: BlockHash): number | null {
        const blockHeight = this.stateManager.blocksIndex.findIndex((_blockHash: BlockHash) => _blockHash === blockHash);
        return blockHeight > -1 ? blockHeight : null;
    }


    getBlockByHash(blockHash: BlockHash): Block | null {
        const blockHeight = this.getBlockHeight(blockHash);

        if (blockHeight === null) {
            return null;
        }

        return this.getBlock(blockHeight) ?? null;
    }


    getTransactionByHash(txHash: TransactionHash): Transaction | null {
        const blockHeight = this.stateManager.transactionsIndex[txHash];
        //asserts(typeof blockHeight === 'number', `transaction "${txHash}" not found`)
        if (typeof blockHeight !== 'number') return null;

        const block = this.getBlock(blockHeight);
        asserts(block, `block "${blockHeight}" not found for transaction "${txHash}"`);
        //if (! block) return null;

        const transactionIndex = block.transactions.findIndex(_tx => _tx.hash === txHash);
        asserts(transactionIndex > -1, `transaction "${txHash}" not found in block "${blockHeight}"`);
        //if (transactionIndex === -1) return null;

        return block.transactions[transactionIndex];
    }


    /** 📥 Retourne un block complet en chargeant le fichier JSON */
    getBlock(blockHeight: number): Block | null {
        console.log(`[${now()}][Chain.getBlock]`, blockHeight);

        if (this.memoryState.blocks[blockHeight]) {
            // cherche dans les blocks en memoire
            return this.memoryState.blocks[blockHeight];
        }

        // Vérifier si le block existe dans l'index
        const blockHash = this.stateManager.blocksIndex[blockHeight];

        if (! blockHash) {
            // block inconnu
            console.warn(`[Chain.getBlock] Block ${blockHeight} introuvable`);
            throw new Error(`[Chain.getBlock] unknown block at height "${blockHeight}"`);
        }

        let block: Block | undefined;

        if (! block) {
            // cherche dans les blocks sur disque
            block = this.stateManager.loadBlock(blockHeight) ?? undefined;

            if (block) {
                this.memoryState.blocks[blockHeight] = block;
            }
        }

        if (! block) {
            throw new Error(`block "${blockHeight}" not found`);
        }

        return block;
    }


    getAccount(address: AccountAddress): Account {
        asserts(typeof address === 'string', `invalid address type for address "${address}"`);
        asserts(address.startsWith('0x'), `invalid address format for address "${address}"`);
        asserts(address === '0x' || address.length === 42, `invalid address length for address "${address}"`);
        asserts(address === '0x' || /^0x[a-fA-F0-9]{40}$/.test(address), `invalid address for address "${address}"`);

        const addressLower = address.toLowerCase() as AccountAddress;

        if (this.memoryState.accounts[addressLower]) {
            // cherche dans les accounts en memoire
            return this.memoryState.accounts[addressLower];
        }

        const accountHash = this.stateManager.accountsIndex[addressLower];

        let account: Account | undefined;

        if (! accountHash) {
            // account inconnu => charge un account vide
            account = new Account(address);
            this.memoryState.accounts[addressLower] = account;
        }

        if (! account) {
            // cherche dans les accounts sur disque
            account = this.stateManager.loadAccount(address) ?? undefined;

            if (account) {
                this.memoryState.accounts[addressLower] = account;
            }
        }

        if (! account) {
            throw new Error(`account "${address}" not found`);
        }

        return account;
    }


    /** 📥 Récupère le dernier height connu */
    get blockHeight(): number {
        return this.stateManager.blocksIndex.length - 1;
    }


    increaseSupply(amount: bigint) {
        console.log(`[${now()}][Chain.increaseSupply]`);

        asserts(typeof amount === 'bigint', `[Chain.increaseSupply] invalid amount type : typeof "${amount}" => "${typeof amount}"`);
        asserts(amount > 0, "[Chain.increaseSupply] invalid amount");

        this.totalSupply += amount;
    }


    decreaseSupply(amount: bigint) {
        console.log(`[${now()}][Chain.decreaseSupply]`);

        asserts(typeof amount === 'bigint', `[Chain.decreaseSupply] invalid amount type : typeof "${amount}" => "${typeof amount}"`);
        asserts(amount > 0, "[Chain.decreaseSupply] invalid amount");
        asserts(this.totalSupply >= amount, '[Chain.decreaseSupply] insufficient supply');

        this.totalSupply -= amount;
    }


    transfer(emitterAddress: AccountAddress, recipientAddress: AccountAddress, amount: bigint): void {
        console.log(`[${now()}][Chain.transfer]`);

        asserts(typeof emitterAddress === 'string', "[Chain.transfer] invalid emitterAddress type");
        asserts(typeof recipientAddress === 'string', "[Chain.transfer] invalid recipientAddress type");
        asserts(typeof amount === 'bigint', `[Chain.transfer] invalid amount type : typeof "${amount}" => "${typeof amount}"`);

        const emitter = this.getAccount(emitterAddress);
        const recipient = this.getAccount(recipientAddress);

        emitter.burn(amount);
        recipient.mint(amount);
    }



    public burn(account: Account, amount: bigint) {
        asserts(typeof account === 'object' && account.constructor.name === 'Account', "[Chain.burn] invalid account type");
        asserts(typeof amount === 'bigint', `[Chain.burn] invalid amount type : typeof "${amount}" => "${typeof amount}"`);
        asserts(amount > 0, `[Chain.burn] invalid amount`);
        asserts(account.balance >= amount, `[Account.burn] insufficient balance for ${account.address}`);

        account.burn(amount);

        this.decreaseSupply(amount)
    }


    public mint(account: Account, amount: bigint) {
        asserts(typeof account === 'object' && account.constructor.name === 'Account', "[Chain.mint] invalid account type");
        asserts(typeof amount === 'bigint', `[Chain.mint] invalid amount type : typeof "${amount}" => "${typeof amount}"`);
        asserts(amount > 0, `[Chain.mint] invalid amount`);

        account.mint(amount);

        this.increaseSupply(amount)
    }



    async createGenesisBlock(): Promise<{ block: Block, blockReceipt: BlockReceipt }> {
        asserts(this.blockHeight === -1, `[Chain.addGenesisBlock] invalid block height`);

        // 1. Créer nouveau block
        const block = new Block(0, '0x');
        block.timestamp = genesisTimestamp;

        // 2. Execute le block
        const blockReceipt = await this.executeBlock(block);

        // 3. Ajoute le block à la blockchain
        this.insertExecutedBlock(block);

        return { block, blockReceipt };
    }


    async createNewBlock(minerAddress: AccountAddress): Promise<{ block: Block, blockReceipt: BlockReceipt } | null> {
        console.log(`[${now()}][Chain.createNewBlock]`);

        // 1. Charge le dernier block (ajustement de height & hash)
        const lastBlock = this.blockHeight > -1 ? this.getBlock(this.blockHeight) : { blockHeight: -1, hash: '0x' as BlockHash };
        asserts(lastBlock, '[Chain.createNewBlock] parent block not found');
        asserts(lastBlock.hash, '[Chain.createNewBlock] empty parent block hash');


        // 2. Choisi des transactions dans la mempool // TODO: choisir les transactions dans l'ordre decroissant de fees potentielles
        const transactions: Transaction[] = this.mempool.getPendingTransactions();

        if (transactions.length < blockMinTransactions) {
            return null;
        }


        // 3. Crée un nouveau block
        const block = new Block(lastBlock.blockHeight + 1, lastBlock.hash);
        block.miner = minerAddress;
        block.timestamp = Date.now();


        // 4. Ajoute les transaction au block en construction
        block.transactions = transactions.slice(0, blockMaxTransactions);

        transactions.forEach(tx => {
            tx.blockHeight = block.blockHeight;
            tx.blockHash = block.hash;
        });


        // 5. Execute le block
        const blockReceipt = await this.executeBlock(block);


        // 6. Vérification de l'intégrité du block
        asserts(block.hash, '[Chain.createNewBlock] empty new block hash');
        asserts(blockReceipt.hash === block.hash, `[Chain.createNewBlock] hash mismatch`);
        asserts(blockReceipt.transactionsReceipts.length === block.transactions.length, `[Chain.createNewBlock] invalid receipt`);


        // 7. Ajoute le block à la blockchain
        this.insertExecutedBlock(block);


        // 8. Diffuse the new block
        if (this.p2p) {
            this.p2p.broadcastBlock(block);
        }

        return { block, blockReceipt };
    }


    async addExistingBlock(block: Block): Promise<BlockReceipt> {
        console.log(`[${now()}][Chain.addExistingBlock]`);

        // 1. Charge le dernier block (verification de height & hash)
        const lastBlock = this.blockHeight > -1 ? this.getBlock(this.blockHeight) : { blockHeight: -1, hash: '0x' as BlockHash };
        asserts(lastBlock, '[Chain.addExistingBlock] iparent block not found');
        asserts(lastBlock.hash, '[Chain.addExistingBlock] iempty parent block hash');


        // 2. Execute le block
        asserts(block.hash, '[Chain.addExistingBlock] empty block hash');
        const blockHashOld = block.hash;
        const blockReceipt = await this.executeBlock(block);

        // 3. Vérification de l'intégrité du block
        asserts(blockHashOld === block.hash, `[Chain.addExistingBlock] blockHash mismatch (Expected: ${blockHashOld} / Found: ${block.hash})`);
        asserts(blockReceipt.hash === block.hash, `[Chain.addExistingBlock] blockHash receipt mismatch (Expected: ${blockReceipt.hash} / Found: ${block.hash})`);
        asserts(blockReceipt.transactionsReceipts.length === block.transactions.length, `[Chain.addExistingBlock] invalid receipt`);


        // 4. Ajoute le block à la blockchain
        this.insertExecutedBlock(block);


        return blockReceipt;
    }


    async executeBlock(block: Block): Promise<BlockReceipt> {
        console.log(`[${now()}][Chain.executeBlock]`);

        let currentBlockReward = blockReward;
        const transactionsReceipts: TransactionReceipt[] = [];


        // execute transactions...
        let transactionIndex = -1;
        for (const tx of block.transactions) {
            transactionIndex++;
            console.log(`[${now()}][Chain.executeBlock] add tx ${transactionIndex+1}/${block.transactions.length} => "${tx.hash}"`);

            const txReceipt = await block.executeTransaction(this, block, tx);
            transactionsReceipts.push(txReceipt);

            // Add transaction fees to block reward
            currentBlockReward += txReceipt.fees;
        }


        // Ajout d'une transaction de Mint (pour le miner du block)
        if (! block.hash && block.miner && block.miner !== '0x' && currentBlockReward > 0n) {
            const tx = new Transaction('0x', currentBlockReward, BigInt(this.blockHeight))
                .mint(block.miner, currentBlockReward);

            tx.hash = tx.computeHash();

            block.transactions.push(tx);

            const txReceipt = await block.executeTransaction(this, block, tx);
            transactionsReceipts.push(txReceipt);
        }


        // Si on est en train de créé un nouveau block, on injecte les receipts
        if (! block.hash) {
            block.receipts = transactionsReceipts;
        }

        const blockHash: BlockHash = block.computeHash();


        // Si on est en train de créé un nouveau block, on défini son hash
        if (! block.hash) {
            block.hash = blockHash;
        }


        console.log(`[${now()}][Chain.executeBlock] execution completed`);

        const blockReceipt: BlockReceipt = {
            hash: blockHash,
            transactionsReceipts,
        };

        return blockReceipt;
    }


    async insertExecutedBlock(block: Block): Promise<void> {
        // Ajoute le block à la blockchain
        this.saveBlockchainAfterNewBlock(block);

        // Supprime les transactions de la mempool
        this.mempool.clearMempool(block.transactions);
    }


    saveBlockchainAfterNewBlock(block: Block): void {
        console.log(`[${now()}][Chain.saveBlockchainAfterNewBlock]`);

        asserts(block.blockHeight === this.blockHeight + 1, `[Chain.saveBlockchainAfterNewBlock] invalid blockHeight`);

        const parentBlockHash = this.getBlockHash(block.blockHeight - 1) ?? '0x';
        asserts(block.parentBlockHash === parentBlockHash, `[Chain.saveBlockchainAfterNewBlock] invalid parentBlockHash. Expected "${parentBlockHash}" / Found: "${block.parentBlockHash}"`);

        asserts(block.hash, `[Chain.saveBlockchainAfterNewBlock] missing block hash`);


        // Ajout des transactions à transactionsIndex
        for (const tx of block.transactions) {
            const txHash = tx.hash;
            asserts(txHash, `[Chain.saveBlockchainAfterNewBlock] missing transaction hash`);

            asserts(! (txHash in this.stateManager.transactionsIndex), `transaction already mined`);
            this.stateManager.transactionsIndex[txHash] = block.blockHeight;
        }

        // Sauvegarde du block sur le disque
        this.stateManager.saveBlock(block);

        // Ajout du block à blocksIndex
        this.stateManager.lastBlockHash = block.hash;
        this.stateManager.blocksIndex.push(block.hash);

        // Sauvegarde des accounts modifiés pendant le block
        for (const address in this.memoryState.accounts) {
            const addressLower = address.toLowerCase() as AccountAddress;
            const account = this.memoryState.accounts[addressLower];

            // Recalcul du nouveau hash du compte
            account.hash = account.computeHash();

            // Sauvegarde du compte sur le disque
            this.stateManager.saveAccount(account);
            this.stateManager.accountsIndex[addressLower] = account.hash;
        }

        // Calcul des nouveaux hashes
        this.stateManager.accountsHash = computeHash(this.stateManager.accountsIndex);
        this.stateManager.blocksHash = computeHash(this.stateManager.blocksIndex);
        this.stateManager.transactionsHash = computeHash(this.stateManager.transactionsIndex);

        // Sauvegarde des métadonnées & indexes de la blockchain
        this.stateManager.saveAccountsIndex();
        this.stateManager.saveBlocksIndex();
        this.stateManager.saveTransactionsIndex();
        this.stateManager.saveMetadata();
    }

}




