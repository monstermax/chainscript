// mempool.ts

import { asserts, computeHash, now } from './utils';
import { Blockchain } from './blockchain';
import { Transaction } from './transaction';


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


    /** 📥 Ajouter une transaction au mempool */
    addTransaction(tx: Transaction) {
        const emitterAccount = this.blockchain.getAccount(tx.from, null);
        asserts(emitterAccount, `[Mempool][addTransaction] emitter account not found`);

        if (typeof tx.nonce === 'bigint') {
            asserts(tx.nonce === BigInt(emitterAccount.transactionsCount), `invalid nonce. (Found: ${tx.nonce} / Expected: ${emitterAccount.transactionsCount})`);

        } else {
            tx.nonce = BigInt(emitterAccount.transactionsCount);
        }

        tx.hash = tx.computeHash();

        if (this.transactions.has(tx.hash)) {
            throw new Error(`[Mempool][addTransaction] Transaction ${tx.hash} déjà en attente.`);
        }

        // TODO: gérer le dispatch aux autres noeuds (si la tx est arrivée par le RPC local ET que P2P est actif)

        this.transactions.set(tx.hash, tx);
        console.log(`[${now()}][Mempool][addTransaction] Transaction ajoutée: ${tx.hash}`);
    }


    /** 📤 Récupérer toutes les transactions en attente */
    getPendingTransactions(): Transaction[] {
        return Array.from(this.transactions.values());
    }


    /** 🔥 Vider le mempool après l'ajout d'un block */
    clearMempool(transactionsIncluded: Transaction[]) {
        for (const tx of transactionsIncluded) {
            asserts(tx.hash, `missing transaction hash`)
            this.transactions.delete(tx.hash);
        }

        //console.log(`[${now()}][Mempool][clearMempool] Nettoyage: ${transactionsIncluded.length} transactions supprimées.`);
    }

}

