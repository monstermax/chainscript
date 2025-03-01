// blockchain.ts

import http from 'http';

import { blockDelayMax, blockMaxTransactions, blockMinTransactions, blockReward, chainId, emptyAddress, genesisTimestamp, MAX_MEMORY_ACCOUNTS, MAX_MEMORY_BLOCKS, MAX_MEMORY_RECEIPTS, MAX_MEMORY_TRANSACTIONS, networkVersion } from '@backend/config';
import { asserts, computeHash, now } from '@backend/helpers/utils';
import { StateManager } from './stateManager';
import { Transaction } from './transaction';
import { Account } from './account';
import { MemoryState } from './stateManager';
import { Mempool } from '@backend/mempool/mempool';
import { Block } from './block';
import { P2PNode } from '@backend/p2p/p2p';
import { BlocksMiner } from '@backend/miner/miner';

import type { TransactionHash } from '@backend/types/transaction.types';
import type { BlockHash, BlockReceipt } from '@backend/types/block.types';
import type { AccountAddress } from '@backend/types/account.types';
import { TransactionReceipt } from './receipt';



/* ######################################################### */


export class Blockchain {
    public memoryState: MemoryState;
    public stateManager: StateManager;
    public mempool: Mempool;
    public totalSupply: bigint = 0n;
    public stateDir: string;
    public p2p: P2PNode | null = null;
    public miner: BlocksMiner | null = null;
    public server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | null = null;


    constructor(stateDir: string='~/.blockchain-js') {
        this.stateDir = stateDir;
        this.memoryState = new MemoryState;
        this.stateManager = new StateManager(this);
        this.mempool = new Mempool(this);

        this.loadBlockchain();
        this.mempool.loadMempoolTransactions();
    }


    /** Charge les indexes (blocks, accounts, transactions) depuis le stockage */
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


        // Vérifier la cohérence du nb d'accounts
        const totalAccounts = this.stateManager.loadAccountsIndex();

        if (metadata?.totalAccounts !== totalAccounts) {
            console.warn(`⚠️ Le nombre de accounts a été modifié ! (expected: "${metadata?.totalAccounts}" found: "${totalAccounts}")`);
        }



        // Vérifier la cohérence du hash transactions
        const transactionsHash = computeHash(this.stateManager.transactionsIndex);

        if (transactionsHash !== this.stateManager.transactionsHash) {
            console.warn(`⚠️ Le transactionsHash a été modifié ! (expected: "${transactionsHash}" found: "${this.stateManager.transactionsHash}")`);
            debugger;
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


    /** Retourne le hash d’un block à partir de son height */
    getBlockHash(blockHeight: number): string | null {
        return this.stateManager.blocksIndex[blockHeight] ?? null;
    }


    /** Retourne la hauteur d'un block d'après son hash */
    getBlockHeight(blockHash: BlockHash): number | null {
        const blockHeight = this.stateManager.blocksIndex.findIndex((_blockHash: BlockHash) => _blockHash === blockHash);
        return blockHeight > -1 ? blockHeight : null;
    }


    /** Retourne un block d'après son hash */
    getBlockByHash(blockHash: BlockHash): Block | null {
        const blockHeight = this.getBlockHeight(blockHash);

        if (blockHeight === null) {
            return null;
        }

        return this.getBlock(blockHeight) ?? null;
    }


    /** Retourne une transaction d'après son hash */
    getTransactionByHash(txHash: TransactionHash): Transaction | null {

        return this.getTransaction(txHash);
    }


    /** Retourne un block complet en chargant le fichier JSON (ou depuis le cache) */
    getBlock(blockHeight: number /* , memoryState?: MemoryState | null */): Block | null {
        console.log(`[${now()}][Chain.getBlock]`, blockHeight);

        const memoryState: MemoryState = this.memoryState;

        // 1. Vérifie si le block est déjà en mémoire
        if (memoryState && blockHeight in memoryState.blocks) {
            return memoryState.blocks[blockHeight];
        }


        // 2. Vérifie si le block est sur disque
        if (blockHeight in this.stateManager.blocksIndex) {
            const block: Block | undefined = this.stateManager.loadBlock(blockHeight) ?? undefined;
            asserts(block, `[Chain.getBlock] block not found on disk`);

            if (memoryState) {
                // Ajout du block en cache mémoire (LRU cache simplifié)
                memoryState.blocks[blockHeight] = block;

                // Si trop de blocks en mémoire, supprimer le plus ancien
                if (Object.keys(memoryState.blocks).length > MAX_MEMORY_BLOCKS) {
                    const oldestBlockHeight = Math.min(...Object.keys(memoryState.blocks).map(Number));
                    delete memoryState.blocks[oldestBlockHeight];
                    console.log(`[Chain.getBlock] Cache LRU: Suppression du block ${oldestBlockHeight}`);
                }
            }

            return block;
        }


        // 3. Block inconnu
        console.warn(`[Chain.getBlock] Block ${blockHeight} introuvable`);
        //throw new Error(`[Chain.getBlock] unknown block at height "${blockHeight}"`);

        return null;
    }


    /** Retourne un account complet en chargant le fichier JSON (ou depuis le cache) */
    getAccount(address: AccountAddress, memoryState: MemoryState | null): Account {
        asserts(typeof address === 'string', `[Chain.getAccount] invalid address type for address "${address}"`);
        asserts(address.startsWith('0x'), `[Chain.getAccount] invalid address format for address "${address}"`);
        asserts(address.length === 42, `[Chain.getAccount] invalid address length for address "${address}"`);
        asserts(/^0x[a-fA-F0-9]{40}$/.test(address), `[Chain.getAccount] invalid address for address "${address}"`);

        const addressLower = address.toLowerCase() as AccountAddress;
        //const memoryState = this.memoryState;


        // 1. Vérifie si l'account est déjà en mémoire
        if (memoryState && addressLower in memoryState.accounts) {
            return memoryState.accounts[addressLower];
        }


        // 2. Vérifie si l'account est stocké sur disque
        if (addressLower in this.stateManager.accountsIndex) {
            const account: Account | undefined = this.stateManager.loadAccount(address) ?? undefined;
            asserts(account, `[Chain.getAccount] account not found on disk`);

            if (memoryState) {
                // Ajout en cache mémoire
                memoryState.accounts[addressLower] = account;

                // Si trop de comptes en mémoire, supprimer le plus ancien
                if (Object.keys(memoryState.accounts).length > MAX_MEMORY_ACCOUNTS) {
                    const oldestAddress = Object.keys(memoryState.accounts)[0]; // Suppression FIFO (à revoir car un object ne conserve pas l'ordre d'insertion)
                    delete memoryState.accounts[oldestAddress];
                    console.log(`[Chain.getAccount] Cache LRU: Suppression de l'account ${oldestAddress}`);
                }
            }

            return account;
        }


        // 3. Si l'account est inconnu, en créer un vide
        const account: Account | undefined = new Account(address);

        if (memoryState) {
            // Ajout en cache mémoire
            memoryState.accounts[addressLower] = account;

            // Si trop de comptes en mémoire, supprimer le plus ancien
            if (Object.keys(memoryState.accounts).length > MAX_MEMORY_ACCOUNTS) {
                const oldestAddress = Object.keys(memoryState.accounts)[0]; // Suppression FIFO
                delete memoryState.accounts[oldestAddress];
                console.log(`[Chain.getAccount] Cache LRU: Suppression de l'account ${oldestAddress}`);
            }
        }

        return account;
    }


    getTransaction(txHash: TransactionHash): Transaction | null {

        const memoryState: MemoryState = this.memoryState;


        // 1. Vérifie si la transaction est déjà en mémoire
        if (memoryState && txHash in memoryState.transactions) {
            return memoryState.transactions[txHash];
        }


        // 2. Vérifie si la transaction est sur disque
        if (txHash in this.stateManager.transactionsIndex) {
            const transaction: Transaction | null = this.stateManager.loadTransaction(txHash);

            asserts(transaction, `[Chain.getTransaction] transaction not found on disk`);

            if (memoryState) {
                // Ajout du block en cache mémoire (LRU cache simplifié)
                memoryState.transactions[txHash] = transaction;

                // Si trop de transactions en mémoire, supprimer le plus ancien
                if (Object.keys(memoryState.transactions).length > MAX_MEMORY_TRANSACTIONS) {
                    const txHash: TransactionHash = Object.keys(memoryState.transactions)[0] as TransactionHash; // Suppression FIFO (à revoir car un object ne conserve pas l'ordre d'insertion)
                    delete memoryState.transactions[txHash];
                    console.log(`[Chain.getTransaction] Cache LRU: Suppression de la transaction ${txHash}`);
                }
            }

            return transaction;
        }

        // transaction inconnue
        console.warn(`[Chain.getTransaction] Transaction ${txHash} introuvable`);
        return null;
    }



    getTransactionReceipt(txHash: TransactionHash): TransactionReceipt | null {

        const memoryState: MemoryState = this.memoryState;


        // 1. Vérifie si la transaction est déjà en mémoire
        if (memoryState && txHash in memoryState.receipts) {
            return memoryState.receipts[txHash];
        }


        // 2. Vérifie si le receipt est sur disque
        if (txHash in this.stateManager.transactionsIndex) {
            const receipt: TransactionReceipt | null = this.stateManager.loadTransactionReceipt(txHash);

            asserts(receipt, `[Chain.getTransactionReceipt] receipt not found on disk`);

            if (memoryState) {
                // Ajout du block en cache mémoire (LRU cache simplifié)
                memoryState.receipts[txHash] = receipt;

                // Si trop de receipts en mémoire, supprimer le plus ancien
                if (Object.keys(memoryState.receipts).length > MAX_MEMORY_RECEIPTS) {
                    const txHash: TransactionHash = Object.keys(memoryState.receipts)[0] as TransactionHash; // Suppression FIFO (à revoir car un object ne conserve pas l'ordre d'insertion)
                    delete memoryState.receipts[txHash];
                    console.log(`[Chain.getTransactionReceipt] Cache LRU: Suppression du receipt ${txHash}`);
                }
            }

            return receipt;
        }

        // receipt inconnue
        console.warn(`[Chain.getTransactionReceipt] Receipt ${txHash} introuvable`);
        return null;
    }



    /** Récupère le dernier height de la blockchain */
    get blockHeight(): number {
        return this.stateManager.blocksIndex.length - 1;
    }


    /** Incrémente la total supply de la blockchain */
    increaseSupply(amount: bigint) {
        console.log(`[${now()}][Chain.increaseSupply]`);

        asserts(typeof amount === 'bigint', `[Chain.increaseSupply] invalid amount type : typeof "${amount}" => "${typeof amount}"`);
        asserts(amount > 0, "[Chain.increaseSupply] invalid amount");

        this.totalSupply += amount;
    }


    /** Décrémente la total supply de la blockchain */
    decreaseSupply(amount: bigint) {
        console.log(`[${now()}][Chain.decreaseSupply]`);

        asserts(typeof amount === 'bigint', `[Chain.decreaseSupply] invalid amount type : typeof "${amount}" => "${typeof amount}"`);
        asserts(amount > 0, "[Chain.decreaseSupply] invalid amount");
        asserts(this.totalSupply >= amount, '[Chain.decreaseSupply] insufficient supply');

        this.totalSupply -= amount;
    }


    /** Transfert de la valeur d'un compte à un autre */
    transfer(emitterAddress: AccountAddress, recipientAddress: AccountAddress, amount: bigint, memoryState: MemoryState | null): void {
        console.log(`[${now()}][Chain.transfer]`);

        asserts(typeof emitterAddress === 'string', `[Chain.transfer] invalid emitterAddress type "${emitterAddress}"`);
        asserts(typeof recipientAddress === 'string', `[Chain.transfer] invalid recipientAddress type "${recipientAddress}"`);
        asserts(typeof amount === 'bigint', `[Chain.transfer] invalid amount type : typeof "${amount}" => "${typeof amount}"`);

        const emitter = this.getAccount(emitterAddress, memoryState);
        const recipient = this.getAccount(recipientAddress, memoryState);

        emitter.burn(amount);
        recipient.mint(amount);
    }


    /** Brule des jetons natifs de la blockchain */
    public burn(account: Account, amount: bigint) {
        asserts(typeof account === 'object' && account.constructor.name === 'Account', "[Chain.burn] invalid account type");
        asserts(typeof amount === 'bigint', `[Chain.burn] invalid amount type : typeof "${amount}" => "${typeof amount}"`);
        asserts(amount > 0, `[Chain.burn] empty amount`);
        asserts(account.balance >= amount, `[Account.burn] insufficient balance for ${account.address}`);

        account.burn(amount);

        this.decreaseSupply(amount)
    }


    /** Emet des jetons natifs de la blockchain */
    public mint(account: Account, amount: bigint) {
        asserts(typeof account === 'object' && account.constructor.name === 'Account', "[Chain.mint] invalid account type");
        asserts(typeof amount === 'bigint', `[Chain.mint] invalid amount type : typeof "${amount}" => "${typeof amount}"`);
        asserts(amount > 0, `[Chain.mint] empty amount`);

        account.mint(amount);

        this.increaseSupply(amount)
    }


    /** Créé le bloc Génésis (block 0) */
    async createGenesisBlock(): Promise<{ block: Block, blockReceipt: BlockReceipt }> {
        asserts(this.blockHeight === -1, `[Chain.createGenesisBlock] invalid block height`);

        // 1. Créer nouveau block
        const block = new Block(0, '0x');
        block.timestamp = genesisTimestamp;

        // 2. Execute le block
        const blockReceipt = await this.executeBlock(block, []);

        // 3. Ajoute le block Genesis à la blockchain
        this.insertExecutedBlock(block, [], blockReceipt);

        return { block, blockReceipt };
    }


    /** Créé/Mine un nouveau block */
    async createNewBlock(minerAddress: AccountAddress): Promise<{ block: Block, blockReceipt: BlockReceipt } | null> {
        console.log(`[${now()}][Chain.createNewBlock]`);

        // 1. Charge le dernier block (ajustement de height & hash)
        const blockHeight = this.blockHeight;
        const lastBlock = this.getBlock(blockHeight);
        asserts(lastBlock, '[Chain.createNewBlock] parent block not found');
        asserts(lastBlock.hash, '[Chain.createNewBlock] empty parent block hash');

        asserts(lastBlock.timestamp, `[Miner.tryToMine] lastBlock has no timestamp`);
        const lastBlockAge = Date.now() - lastBlock.timestamp;


        // 2. Choisi des transactions dans la mempool // TODO: choisir les transactions dans l'ordre decroissant de fees potentielles
        const transactions: Transaction[] = this.mempool.getPendingTransactions();

        if (transactions.length < blockMinTransactions && lastBlockAge < blockDelayMax && blockHeight !== 0) {
            return null;
        }


        // 3. Crée un nouveau block
        const block = new Block(lastBlock.blockHeight + 1, lastBlock.hash);
        block.miner = minerAddress;
        block.timestamp = Date.now();


        // 4. Ajoute les transaction au block en construction
        const blockTransactions: Transaction[] = transactions.slice(0, blockMaxTransactions);

        transactions.forEach(tx => {
            tx.blockHeight = block.blockHeight;
        });

        block.transactions = blockTransactions.map(tx => tx.hash as TransactionHash);


        // 5. Execute le block
        const blockReceipt = await this.executeBlock(block, blockTransactions);


        // 6. Vérification de l'intégrité du block
        asserts(block.hash, '[Chain.createNewBlock] empty new block hash');
        asserts(blockReceipt.hash === block.hash, `[Chain.createNewBlock] hash mismatch`);
        asserts(blockReceipt.transactionsReceipts.length === blockTransactions.length, `[Chain.createNewBlock] invalid receipt`);


        // 7. Ajoute le block miné à la blockchain
        this.insertExecutedBlock(block, blockTransactions, blockReceipt);


        // 8. Diffuse le nouveau block
        if (this.p2p) {
            this.p2p.broadcastBlock(block, blockTransactions);
        }

        return { block, blockReceipt };
    }


    /** Ajoute un block (déjà miné - par un autre noeud - mais pas executé localement) à la blockchain */
    async addExistingBlock(block: Block, blockTransactions: Transaction[]): Promise<BlockReceipt> {
        console.log(`[${now()}][Chain.addExistingBlock]`);

        // 1. Charge le dernier block (verification de height & hash)
        const lastBlock = this.blockHeight > -1 ? this.getBlock(this.blockHeight) : { blockHeight: -1, hash: '0x' as BlockHash };
        asserts(lastBlock, '[Chain.addExistingBlock] parent block not found');
        asserts(lastBlock.hash, '[Chain.addExistingBlock] empty parent block hash');

        // 2. Execute le block
        asserts(block.hash, '[Chain.addExistingBlock] empty block hash');
        const blockReceipt = await this.executeBlock(block, blockTransactions);

        // 3. Vérification de l'intégrité du block/receipt
        asserts(blockReceipt.hash === block.hash, `[Chain.addExistingBlock] blockHash receipt mismatch (Expected: ${blockReceipt.hash} / Found: ${block.hash})`);
        asserts(blockReceipt.transactionsReceipts.length === blockTransactions.length, `[Chain.addExistingBlock] invalid receipt`);

        // 4. Ajoute le block recu à la blockchain
        this.insertExecutedBlock(block, blockTransactions, blockReceipt);

        // 5. Diffuse le nouveau block
        if (this.p2p) {
            //this.p2p.broadcastBlock(block); // TODO: conserver une liste des blocks que les peers connaissent, afin de pas leur ré-envoyer des blocks qu'ils ont déjà
        }

        return blockReceipt;
    }


    /** Execute les transactions d'un block */
    async executeBlock(block: Block, blockTransactions: Transaction[]): Promise<BlockReceipt> {
        console.log(`[${now()}][Chain.executeBlock]`);

        let currentBlockReward = blockReward;
        const transactionsReceipts: TransactionReceipt[] = [];

        // Supprime les temp accounts (avant minage d'un bloc) // Important, si jamais il y a eu des rollback/revert pendant une tentative précédente de blocks échouée
        this.memoryState.accounts = {};


        // Execute chaque transaction du block...
        let transactionIndex = -1;
        for (const tx of blockTransactions) {
            transactionIndex++;
            console.log(`[${now()}][Chain.executeBlock] add tx ${transactionIndex+1}/${blockTransactions.length} => "${tx.hash}"`);

            // Execute une transaction
            const txReceipt = await block.executeTransaction(this, block, tx);
            transactionsReceipts.push(txReceipt);

            // Ajout des fees à la récompense de block
            currentBlockReward += txReceipt.fees ?? 0n;
        }

        // Ajout d'une transaction de Mint (pour le miner du block)
        if (! block.hash && block.miner !== emptyAddress && currentBlockReward > 0n) {
            const tx = new Transaction(emptyAddress, currentBlockReward, BigInt(this.blockHeight))
                .mint(block.miner, currentBlockReward);

            tx.hash = tx.computeHash();

            blockTransactions.push(tx);

            const txReceipt = await block.executeTransaction(this, block, tx);
            transactionsReceipts.push(txReceipt);
        }

        // Si on est en train de créer un nouveau block, on injecte les receipts (avant de calculer le hash)
        if (! block.hash) {
            block.transactions = blockTransactions.map(tx => tx.hash ?? '0x');
            //block.receipts = transactionsReceipts;
        }

        const blockHash: BlockHash = block.computeHash();


        if (! block.hash) {
            // Si on est en train de créer un nouveau block, on vérifie le challenge de difficulté puis on défini son hash précédemment calculé

            // TODO: introduire ici la notion de difficulté et boucler sur la ligne `computeHash()` en incrementant le nonce tant que la condition de difficulté n'est pas remplie

            block.hash = blockHash;

            transactionsReceipts.forEach(receipt => receipt.blockHash = blockHash);

            blockTransactions.forEach((tx, transactionIndex) => {
                tx.blockHash = blockHash;
                tx.blockHeight = block.blockHeight;
                tx.transactionIndex = transactionIndex;
            });

        } else {
            // Sinon on compare le hash fourni et le hash calculé
            asserts(blockHash === block.hash, `[Chain.executeBlock] blockHash mismatch (Expected: ${blockHash} / Found: ${block.hash})`);
        }


        console.log(`[${now()}][Chain.executeBlock] execution completed`);


        // Création du receipt de block
        const blockReceipt: BlockReceipt = {
            hash: blockHash,
            transactionsReceipts,
        };

        return blockReceipt;
    }


    /** Ajoute un bloc miné à la blockchain ET Enregistre sur disque les modifications faites par un nouveau block (block, accounts, indexes, hashes, metadata) */
    async insertExecutedBlock(block: Block, blockTransactions: Transaction[], blockReceipt: BlockReceipt): Promise<void> {
        console.log(`[${now()}][Chain.saveBlockchainAfterNewBlock]`);

        asserts(block.blockHeight === this.blockHeight + 1, `[Chain.saveBlockchainAfterNewBlock] invalid blockHeight`);

        const parentBlockHash = this.getBlockHash(block.blockHeight - 1) ?? '0x';
        asserts(block.parentBlockHash === parentBlockHash, `[Chain.saveBlockchainAfterNewBlock] invalid parentBlockHash. Expected "${parentBlockHash}" / Found: "${block.parentBlockHash}"`);

        asserts(block.hash, `[Chain.saveBlockchainAfterNewBlock] missing block hash`);
        asserts(block.hash === blockReceipt.hash, `[Chain.saveBlockchainAfterNewBlock] receipt block hash mistmatch`);
        asserts(blockTransactions.length === blockReceipt.transactionsReceipts.length, `[Chain.saveBlockchainAfterNewBlock] receipts count mistmatch block hash`);


        // Ajout des transactions à transactionsIndex
        for (const tx of blockTransactions) {
            const txHash = tx.hash;
            asserts(txHash, `[Chain.saveBlockchainAfterNewBlock] missing transaction hash`);

            asserts(! (txHash in this.stateManager.transactionsIndex), `[Chain.saveBlockchainAfterNewBlock] transaction already mined`);
            this.stateManager.transactionsIndex[txHash] = block.blockHeight;
        }


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


        // Sauvegarde des transactions sur disque
        for (const index in blockTransactions) {
            const tx = blockTransactions[index];
            const receipt = blockReceipt.transactionsReceipts[index];

            asserts(tx, `[Chain.saveBlockchainAfterNewBlock] transaction not found`);
            asserts(receipt, `[Chain.saveBlockchainAfterNewBlock] receipt not found`);
            asserts(receipt.transactionHash === tx.hash, `[Chain.saveBlockchainAfterNewBlock] receipt hash mismatch`);

            this.stateManager.saveTransaction(tx);
            this.stateManager.saveReceipt(receipt);
        }

        // Calcul des nouveaux hashes
        this.stateManager.accountsHash = computeHash(this.stateManager.accountsIndex);
        this.stateManager.blocksHash = computeHash(this.stateManager.blocksIndex);
        this.stateManager.transactionsHash = computeHash(this.stateManager.transactionsIndex);

        // Sauvegarde des métadonnées & indexes de la blockchain
        this.stateManager.saveAccountsIndex();
        this.stateManager.saveBlocksIndex();
        this.stateManager.saveTransactionsIndex();
        const metadata = this.stateManager.saveMetadata();

        // Sauvegarde de la transaction sur le disque
        block.setBlockchainMetadata(metadata);
        block.setUpdatedAccounts(this.memoryState.accounts);
        this.stateManager.saveBlock(block);

        // Supprime les transactions de la mempool
        this.mempool.clearMempool(blockTransactions);

        // Supprime les temp accounts (apres minage d'un bloc)
        this.memoryState.accounts = {};

    }

}




