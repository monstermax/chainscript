// blockchain.ts

import { blockReward, chainId, networkVersion } from './config';
import { asserts, computeHash, now } from './utils';
import { StateManager } from './stateManager';
import { Transaction } from './transaction';
import { Account } from './account';
import { MemoryState } from './stateManager';
import { Mempool } from './mempool';
import { Block } from './block';

import type { TransactionHash } from './types/transaction.types';
import type { BlockHash, BlockReceipt } from './types/block.types';
import type { AccountAddress } from './types/account.types';



/* ######################################################### */


export class Blockchain {
    public memoryState: MemoryState;
    public stateManager: StateManager;
    public mempool: Mempool = new Mempool(this);
    public totalSupply: bigint = 0n;



    constructor() {
        this.memoryState = new MemoryState;
        this.stateManager = new StateManager(this);

        this.loadBlockchain();
    }


    /** 📤 Charge les blocks depuis le stockage */
    loadBlockchain() {
        console.log(`[${now()}][Blockchain.loadBlockchain]`);

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
        console.log(`[${now()}][Blockchain.getBlock]`, blockHeight);

        if (this.memoryState.blocks[blockHeight]) {
            // cherche dans les blocks en memoire
            return this.memoryState.blocks[blockHeight];
        }

        // Vérifier si le block existe dans l'index
        const blockHash = this.stateManager.blocksIndex[blockHeight];

        if (! blockHash) {
            // block inconnu
            console.warn(`[Blockchain.getBlock] Block ${blockHeight} introuvable`);
            throw new Error(`[Blockchain.getBlock] unknown block at height "${blockHeight}"`);
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
        console.log(`[${now()}][Blockchain.increaseSupply]`);

        asserts(typeof amount === 'bigint', "[Blockchain.increaseSupply] invalid amount type");
        asserts(amount > 0, "[Blockchain.increaseSupply] invalid amount");

        this.totalSupply += amount;
    }


    decreaseSupply(amount: bigint) {
        console.log(`[${now()}][Blockchain.decreaseSupply]`);

        asserts(typeof amount === 'bigint', "[Blockchain.decreaseSupply] invalid amount type");
        asserts(amount > 0, "[Blockchain.decreaseSupply] invalid amount");
        asserts(this.totalSupply >= amount, '[Blockchain.decreaseSupply] insufficient supply');

        this.totalSupply -= amount;
    }


    transfer(emitterAddress: AccountAddress, recipientAddress: AccountAddress, amount: bigint): void {
        console.log(`[${now()}][Blockchain.transfer]`);

        asserts(typeof emitterAddress === 'string', "[Blockchain.transfer] invalid emitterAddress type");
        asserts(typeof recipientAddress === 'string', "[Blockchain.transfer] invalid recipientAddress type");
        asserts(typeof amount === 'bigint', "[Blockchain.transfer] invalid amount type");

        const emitter = this.getAccount(emitterAddress);
        const recipient = this.getAccount(recipientAddress);

        emitter.burn(amount);
        recipient.mint(amount);
    }



    public burn(account: Account, amount: bigint) {
        asserts(typeof account === 'object' && account.constructor.name === 'Account', "[Blockchain.burn] invalid account type");
        asserts(typeof amount === 'bigint', "[Blockchain.burn] invalid amount type");
        asserts(amount > 0, `[Blockchain.burn] invalid amount`);
        asserts(account.balance >= amount, `[Account.burn] insufficient balance for ${account.address}`);

        account.burn(amount);

        this.decreaseSupply(amount)
    }


    public mint(account: Account, amount: bigint) {
        asserts(typeof account === 'object' && account.constructor.name === 'Account', "[Blockchain.mint] invalid account type");
        asserts(typeof amount === 'bigint', "[Blockchain.mint] invalid amount type");
        asserts(amount > 0, `[Blockchain.mint] invalid amount`);

        account.mint(amount);

        this.increaseSupply(amount)
    }



    async createGenesisBlock(): Promise<{ block: Block, receipt: BlockReceipt }> {
        asserts(this.blockHeight === -1, `[Blockchain.addGenesisBlock] invalid block height`);

        // Créer nouveau block
        const block = new Block(0, '0x');
        block.timestamp = Date.now();

        // Ajouter a la blockchain
        const { receipt } = await this.addBlock(block);
        asserts(receipt.hash, `[Blockchain.addGenesisBlock] missing block hash`);

        return { block, receipt };
    }


    async createBlock(minerAddress: AccountAddress): Promise<{ block: Block, receipt: BlockReceipt }> {
        console.log(`[${now()}][Blockchain.createBlock]`);

        // Load last block
        const lastBlock = this.blockHeight > -1 ? this.getBlock(this.blockHeight) : { blockHeight: -1, hash: '0x' as BlockHash };
        asserts(lastBlock, 'parent block not found');
        asserts(lastBlock.hash, 'empty parent block hash');


        // Créer nouveau block
        const block = new Block(lastBlock.blockHeight + 1, lastBlock.hash);
        block.miner = minerAddress;
        block.timestamp = Date.now();


        // Choisi des transactions dans la mempool
        const transactions: Transaction[] = this.mempool.getPendingTransactions();

        block.transactions = transactions;

        transactions.forEach(tx => {
            tx.blockHeight = block.blockHeight;
            tx.blockHash = block.hash;
        });

        return this.addBlock(block);
    }


    async addBlock(block: Block): Promise<{ block: Block, receipt: BlockReceipt }> {
        console.log(`[${now()}][Blockchain.addBlock]`);

        // Load last block
        const lastBlock = this.blockHeight > -1 ? this.getBlock(this.blockHeight) : { blockHeight: -1, hash: '0x' as BlockHash };
        asserts(lastBlock, 'parent block not found');
        asserts(lastBlock.hash, 'empty parent block hash');


        // Selectionne les transactions du block
        const transactions: Transaction[] = block.transactions;

        // Execute le block
        const blockHashOld = block.hash;
        const blockReceipt = await this.executeBlock(block, transactions);

        if (blockHashOld) {
            asserts(blockHashOld === block.hash, `blockHash mismatch`);
        }

        // Ajoute le block à la blockchain
        this.saveBlockchainAfterNewBlock(block);

        // Supprime les transactions de la mempool
        this.mempool.clearMempool(transactions);

        return { block, receipt: blockReceipt };
    }


    async executeBlock(block: Block, transactions: Transaction[]): Promise<BlockReceipt> {
        console.log(`[${now()}][Blockchain.executeBlock]`);

        let currentBlockReward = blockReward;


        // execute transactions...
        let transactionIndex = -1;
        for (const tx of transactions) {
            transactionIndex++;
            console.log(`[${now()}][Blockchain.executeBlock] add tx ${transactionIndex+1}/${transactions.length} => "${tx.hash}"`);

            const txReceipt = await block.executeTransaction(this, tx);
            block.receipts.push(txReceipt);

            // Add transaction fees to block reward
            currentBlockReward += txReceipt.fees;
        }


        // add a mint transaction
        if (! block.hash && block.miner && block.miner !== '0x' && currentBlockReward > 0n) {
            const tx = new Transaction('0x', currentBlockReward, BigInt(this.blockHeight))
                .mint(block.miner, currentBlockReward);

            tx.hash = tx.computeHash();

            block.transactions.push(tx);

            const txReceipt = await block.executeTransaction(this, tx);
            block.receipts.push(txReceipt);
        }


        const blockHash: BlockHash = block.computeHash();
        block.hash = blockHash;


        const blockReceipt: BlockReceipt = {
            hash: blockHash,
            reward: currentBlockReward,
        };

        console.log(`[${now()}][Blockchain.executeBlock] execution completed`);

        return blockReceipt;
    }


    saveBlockchainAfterNewBlock(block: Block): void {
        console.log(`[${now()}][Blockchain.saveBlockchainAfterNewBlock]`);

        asserts(block.blockHeight === this.blockHeight + 1, `invalid blockHeight`);

        const parentBlockHash = this.getBlockHash(block.blockHeight - 1) ?? '0x';
        asserts(block.parentBlockHash === parentBlockHash, `invalid parentBlockHash. Expected "${parentBlockHash}" / Found: "${block.parentBlockHash}"`);

        asserts(block.hash, `missing block hash`);


        // Ajout des transactions à transactionsIndex
        for (const tx of block.transactions) {
            const txHash = tx.hash;
            asserts(txHash, `missing transaction hash`);

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




