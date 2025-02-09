// blockchain.ts

import { StateManager } from './stateManager';
import { executeTransaction, Transaction } from './transaction';
import { Account } from './account';
import { MemoryState } from './stateManager';
import { asserts, computeHash, computeStrHash } from './utils';
import { blockReward } from './config';

import type { AccountAddress, AccountHash, BlockData, BlockHash, BlockReceipt, HexNumber, TransactionReceipt } from './types';


/* ######################################################### */


export class Blockchain {
    public memoryState: MemoryState;
    public stateManager: StateManager;
    public totalSupply: bigint = 0n;



    constructor() {
        this.memoryState = new MemoryState;
        this.stateManager = new StateManager(this);

        this.loadBlockchain();
    }


    /** 📤 Charge les blocks depuis le stockage */
    loadBlockchain() {
        console.log(`[Blockchain.loadBlockchain]`);

        const metadata = this.stateManager.loadMetadata();

        this.stateManager.blocksHash = metadata.blocksHash;
        this.stateManager.accountsHash = metadata.accountsHash;
        this.stateManager.lastBlockHash = metadata.lastBlockHash;


        // Vérifier la cohérence du nb de blocks
        const totalBlocks = this.stateManager.loadBlocksIndex();

        if (metadata?.totalBlocks !== totalBlocks) {
            console.warn(`⚠️ Le nombre de blocks a été modifié ! (expected: "${metadata?.totalBlocks}" found: "${totalBlocks}")`);
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


        console.log(`Blockchain chargée : ${metadata.totalBlocks} blocks, ${metadata.totalAccounts} comptes.`);
    }



    /** 📤 Retourne le hash d’un block à partir de son height */
    getBlockHash(blockHeight: number): string | null {
        return this.stateManager.blocksIndex[blockHeight] ?? null;
    }


    async addBlock(block: Block): Promise<BlockReceipt> {
        console.log(`[Blockchain.addBlock]`, block.blockHeight);

        // check parent height
        const previousBlockHeight: number = this.blockHeight;
        asserts(block.blockHeight === previousBlockHeight + 1, `[Blockchain.addBlock] invalid block height. expected: "${previousBlockHeight + 1}". found: "${block.blockHeight}"`);

        // check parent hash
        const previousBlockHash: BlockHash = this.stateManager.blocksIndex.length ? this.stateManager.blocksIndex[previousBlockHeight] : '0x';
        asserts(block.parentBlockHash === previousBlockHash, `[Blockchain.addBlock] parentBlockHash mismatch. found: "${block.parentBlockHash}" expected: "${previousBlockHash}"`)

        //this.blocks.push(block);


        try {
            const blockReceipt = await block.mine(this);

            // Enregistre le block sur le disque
            asserts(block.hash, `[StateManager.saveBlock] missing block hash`);

            // Sauvegarde du block sur le disque
            this.stateManager.saveBlock(block);

            // Ajout du block à blocksIndex
            this.stateManager.lastBlockHash = block.hash;
            this.stateManager.blocksIndex.push(block.hash);

            // Sauvegarde des accounts modifiés pendant le block
            for (const address in this.memoryState.accounts) {
                const account = this.memoryState.accounts[address];
                account.hash = computeHash(Account.format(account));

                this.stateManager.saveAccount(account);
                this.stateManager.accountsIndex[address as AccountAddress] = account.hash;

                // TODO: mettre à jour la totalSupply
            }

            // Calcul des nouveaux hashes
            this.stateManager.accountsHash = computeHash(this.stateManager.accountsIndex);
            this.stateManager.blocksHash = computeHash(this.stateManager.blocksIndex);

            // Sauvegarde des métadonnées & indexes de la blockchain
            this.stateManager.saveAccountsIndex();
            this.stateManager.saveBlocksIndex();
            this.stateManager.saveMetadata();

            return blockReceipt;

        } catch (err: any) {
            console.error("❌ Erreur dans l'exécution du block", err);
            throw err;
        }
    }


    /** 📥 Retourne un block complet en chargeant le fichier JSON */
    getBlock(blockHeight: number): Block | null {
        console.log(`[Blockchain.getBlock]`, blockHeight);

        if (this.memoryState.blocks[blockHeight]) {
            // cherche dans les blocks en memoire
            return this.memoryState.blocks[blockHeight];
        }

        const blockHash = this.stateManager.blocksIndex[blockHeight];

        let block: Block | undefined;

        if (! block && ! blockHash) {
            // block inconnu
            throw new Error(`unknown block at height "${blockHeight}"`);
        }

        if (! block) {
            // cherche dans les blocks sur disque
            block = this.stateManager.loadBlock(blockHeight) ?? undefined;

            if (block) {
                this.memoryState.blocks[blockHeight] = block;

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
                const expectedHash: BlockHash = computeHash(Block.format(block));

                if (expectedHash !== blockHash) {
                    debugger;
                    console.warn(`⚠️ Intégrité compromise pour le block ${blockHeight}. (Expected: "${blockHash}" / Found: "${expectedHash}")`);
                    throw new Error(`[Blockchain.getBlock] invalid block hash`);
                }

            }
        }

        if (! block) {
            throw new Error(`block "${blockHeight}" not found`);
        }

        return block;
    }


    getAccount(address: AccountAddress): Account {

        if (this.memoryState.accounts[address]) {
            // cherche dans les accounts en memoire
            return this.memoryState.accounts[address];
        }

        const accountHash = this.stateManager.accountsIndex[address];

        let account: Account | undefined;

        if (! account && ! accountHash) {
            // account inconnu
            account = new Account(address);
            this.memoryState.accounts[address] = account;
        }

        if (! account) {
            // cherche dans les accounts sur disque
            account = this.stateManager.loadAccount(address) ?? undefined;

            if (account) {

                // Vérifier l'intégrité du compte
                const expectedHash: AccountHash = computeHash(Account.format(account));

                if (expectedHash !== accountHash) {
                    console.warn(`⚠️ Intégrité compromise pour le compte ${address}. Expected: "${expectedHash}" / Found: "${accountHash}"`);
                    debugger;
                    throw new Error(`[Blockchain.getAccount] invalid account hash`);
                }

                this.memoryState.accounts[address] = account;
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
        console.log(`[Blockchain.increaseSupply]`);

        asserts(amount > 0, "[Blockchain.increaseSupply] invalid amount")
        this.totalSupply += amount;
    }


    decreaseSupply(amount: bigint) {
        console.log(`[Blockchain.decreaseSupply]`);

        asserts(amount > 0, "[Blockchain.decreaseSupply] invalid amount")
        asserts(this.totalSupply >= amount, '[Blockchain.decreaseSupply] insufficient supply');
        this.totalSupply -= amount;
    }


    transfer(emitterAddress: AccountAddress, recipientAddress: AccountAddress, amount: bigint): void {
        console.log(`[Blockchain.transfer]`);

        const emitter = this.getAccount(emitterAddress);
        const recipient = this.getAccount(recipientAddress);

        emitter.burn(amount);
        recipient.mint(amount);
    }



    public burn(account: Account, amount: bigint) {
        asserts(amount > 0, `[Blockchain.burn] invalid amount`);
        asserts(account.balance >= amount, `[Account.burn] insufficient balance for ${account.address}`);

        account.burn(amount);

        this.decreaseSupply(amount)
    }


    public mint(account: Account, amount: bigint) {
        asserts(amount > 0, `[Blockchain.mint] invalid amount`);

        account.mint(amount);

        this.increaseSupply(amount)
    }

}



export class Block {
    public blockHeight: number;
    public parentBlockHash: BlockHash;
    public miner: AccountAddress = '0x';
    public nonce: bigint = 0n;
    public hash: BlockHash | undefined;
    public transactions: Transaction[] = [];


    constructor(blockHeight: number, parentBlockHash: BlockHash) {
        this.blockHeight = blockHeight;
        this.parentBlockHash = parentBlockHash;
    }


    addTransaction(transaction: Transaction) {
        this.transactions.push(transaction);
    }


    async mine(blockchain: Blockchain): Promise<BlockReceipt> {
        console.log(`[Block.executeTransactions]`);

        let currentBlockReward = blockReward;
        let txHashes: HexNumber = '0x';

        for (const tx of this.transactions) {

            // TRANSACTION START //

            let txFees: bigint = 0n;
            let error: string | null = null;
            let signature: string = '';

            const txReceipt: TransactionReceipt = await executeTransaction(blockchain, tx)
                .then((receipt: TransactionReceipt) => {
                    txFees = receipt.fees;

                    return receipt;
                })
                .catch((err: any) => {
                    error = err.message;
                    txFees = err.fees;

                    // revert accounts modifications
                    console.warn(`TX REVERTED: ${error}`);

                    throw err;
                })
                .finally(() => {
                    // pay transaction fees
                    console.log('txFees:', txFees);

                    if (txFees > 0) {
                        blockchain.getAccount(tx.emitter).burn(txFees);
                        blockchain.getAccount(tx.emitter).incrementTransactions();
                    }
                })


            signature = txReceipt.signature;
            currentBlockReward += txFees;
            txHashes = computeStrHash(`${txHashes}:${signature}`)

            //await accountsManager.saveState();

            // TRANSACTION END //
        }

        if (this.miner && this.miner !== '0x' && currentBlockReward > 0n) {
            const minerAccount = blockchain.getAccount(this.miner);
            blockchain.mint(minerAccount, currentBlockReward);
        }

        const hash: BlockHash = computeHash(Block.format(this))

        this.hash = hash;


        const blockReceipt: BlockReceipt = {
            hash,
            reward: currentBlockReward,
        };

        return blockReceipt;
    }


    static format(block: Block): BlockData {
        const blockData: BlockData = {
            blockHeight: block.blockHeight,
            parentBlockHash: block.parentBlockHash,
            miner: block.miner,
            hash: block.hash,
            transactions: block.transactions.map(tx => Transaction.format(tx)),
            nonce: block.nonce,
        };

        return blockData;
    }
}


export class GenesisBlock extends Block {

    constructor() {
        super(0, '0x');
        this.miner = '0x';
    }

}





