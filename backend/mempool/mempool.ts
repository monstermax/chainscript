// mempool.ts

import { asserts, now } from '../helpers/utils';
import { Blockchain } from '../blockchain/blockchain';
import { Transaction } from '../blockchain/transaction';


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

        if (typeof tx.nonce === 'bigint') {
            asserts(tx.nonce === BigInt(emitterAccount.transactionsCount), `[Mempool][addTransaction] invalid nonce. (Found: ${tx.nonce} / Expected: ${emitterAccount.transactionsCount})`);

        } else {
            // nonce non fourni, on le force
            tx.nonce = BigInt(emitterAccount.transactionsCount);
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
        }

        //console.log(`[${now()}][Mempool][clearMempool] Nettoyage: ${transactionsIncluded.length} transactions supprimées.`);
    }

}

