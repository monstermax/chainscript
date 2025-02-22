// mempool.ts

import path from 'path';
import fs from 'fs';

import { asserts, jsonReviver, now } from '@backend/helpers/utils';
import { Blockchain } from '@backend/blockchain/blockchain';
import { Transaction } from '@backend/blockchain/transaction';
import { TransactionData, TransactionHash } from '@backend/types/transaction.types';


/* ######################################################### */


export class Mempool {
    public blockchain: Blockchain;
    private transactions: Map<string, Transaction> = new Map(); // Clé = txHash


    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;
    }


    toJSON() {
        return Object.fromEntries(
            Object.entries(this.transactions).map(entry => [entry[0], entry[1].toJSON()])
        );
    }


    /** Ajouter une transaction au mempool */
    addTransaction(tx: Transaction) {
        const emitterAccount = this.blockchain.getAccount(tx.from, null);
        asserts(emitterAccount, `[Mempool][addTransaction] emitter account not found`);

        const emitterTransactionsCount = emitterAccount.transactionsCount();

        if (typeof tx.nonce === 'bigint') {
            asserts(tx.nonce >= BigInt(emitterTransactionsCount), `[Mempool][addTransaction] invalid nonce. (Found: ${tx.nonce} / Expected: ${emitterTransactionsCount})`);

        } else {
            // nonce non fourni, on le force
            tx.nonce = BigInt(emitterTransactionsCount);
        }


        const emitterWaitingTransactions = [...this.transactions.values()].filter(_tx => _tx.from === tx.from);
        const sameNonceWaitingTransaction = emitterWaitingTransactions.find(_tx => _tx.nonce === tx.nonce);

        if (sameNonceWaitingTransaction) {
            // L'emetteur a deja une transaction en attente avec le meme nonce
            // TODO
            var debugme = 1; // TODO: gerer les annulations et remplacements de transactions
        }


        tx.hash = tx.computeHash();

        if (this.transactions.has(tx.hash)) {
            throw new Error(`[Mempool][addTransaction] Transaction ${tx.hash} déjà en attente.`);
        }

        // TODO: gérer le dispatch aux autres noeuds (si la tx est arrivée par le RPC local ET que P2P est actif)

        this.transactions.set(tx.hash, tx);
        console.log(`[${now()}][Mempool][addTransaction] Transaction ajoutée: ${tx.hash}`);


        // Sauvegarde la transaction sur le disque
        this.saveMempoolTransaction(tx);
    }


    /** Récupérer toutes les transactions en attente */
    getPendingTransactions(): Transaction[] {
        return Array.from(this.transactions.values());
    }


    /** Vider le mempool après l'ajout d'un block */
    clearMempool(transactionsIncluded: Transaction[]) {
        for (const tx of transactionsIncluded) {
            asserts(tx.hash, `[Mempool][clearMempool] missing transaction hash`)
            this.transactions.delete(tx.hash);
            this.blockchain.stateManager.deleteMempoolTransaction(tx.hash);
        }

        //console.log(`[${now()}][Mempool][clearMempool] Nettoyage: ${transactionsIncluded.length} transactions supprimées.`);
    }



    /** Charge les transactions du mempool */
    loadMempoolTransactions() {
        const files = fs.readdirSync(this.blockchain.stateManager.paths.MEMPOOL_DIR);

        const txHashes = files
            .filter(file => file.endsWith(".json"))
            .map(file => file.replace(".json", "")); // Supprime l'extension

        const transactions = txHashes
            .map(txHash => this.loadTransaction(txHash as TransactionHash))
            .filter(tx => tx);

        console.log('MEMPOOL transactions:', transactions);

        for (const tx of transactions) {
            if (tx && tx.hash && ! this.transactions.has(tx.hash)) {
                this.addTransaction(tx);
            }
        }

    }

    /** Sauvegarde une transaction mempool */
    saveMempoolTransaction(tx: Transaction): void {
        //console.log(`[${now()}][State.saveMempoolTransaction]`, tx.hash);

        const txPath = path.join(this.blockchain.stateManager.paths.MEMPOOL_DIR, `${tx.hash}.json`);

        // Sauvegarde de la transaction
        const txJson: string = tx.toJSON();
        fs.writeFileSync(txPath, txJson);
    }

    /** Charge un compte et vérifie son intégrité */
    loadTransaction(txHash: TransactionHash): Transaction | null {
        //console.log(`[${now()}][State.loadAccount]`, address);

        const txPath = path.join(this.blockchain.stateManager.paths.MEMPOOL_DIR, `${txHash}.json`);
        asserts(fs.existsSync(txPath), `transaction "${txHash}" not found in database`);
        //if (!fs.existsSync(txPath)) return null;

        const raw = fs.readFileSync(txPath, 'utf-8');
        const txData: TransactionData = JSON.parse(raw, jsonReviver);

        const tx = Transaction.from(txData);

        return tx;
    }
}

