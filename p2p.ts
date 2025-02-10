// p2p.ts

import WebSocket, { WebSocketServer } from 'ws';

import { Blockchain } from './blockchain';
import { Transaction } from './transaction';
import { now } from './utils';


/* ######################################################### */

type MessageType = 'NEW_BLOCK' | 'NEW_TRANSACTION' | 'REQUEST_BLOCK' | 'REQUEST_LAST_BLOCK';


interface P2PMessage {
    type: MessageType;
    data: any;
}


/* ######################################################### */


export class P2PNode {
    private blockchain: Blockchain;
    private mempool: Transaction[];
    private sockets: WebSocket[] = [];
    private port: number;


    constructor(blockchain: Blockchain, port=6001) {
        this.blockchain = blockchain;
        this.mempool = [];
        this.port = port;
    }


    /** 📡 Démarre un nœud WebSocket */
    startServer() {
        const server = new WebSocketServer({ port: this.port });

        server.on('connection', (ws) => {
            console.log(`[${now()}][P2P] 🌐 Nouvelle connexion`);
            this.initSocket(ws);
        });

        console.log(`[${now()}][P2P] 🚀 Serveur P2P démarré sur ws://0.0.0.0:${this.port}`);
    }


    /** 🌍 Se connecte à un autre nœud */
    connectToPeer(peerUrl: string) {
        const ws = new WebSocket(peerUrl);

        ws.on('open', () => {
            console.log(`[${now()}][P2P] 🔗 Connecté à ${peerUrl}`);
            this.initSocket(ws);
        });

        ws.on('error', (err) => console.error(`[P2P] ❌ Erreur de connexion :`, err));
    }


    /** 🔌 Initialise un socket WebSocket */
    private initSocket(ws: WebSocket) {
        this.sockets.push(ws);

        ws.on('message', (message: string) => this.handleMessage(ws, message));
        ws.on('close', () => this.sockets = this.sockets.filter(s => s !== ws));
    }


    /** 📩 Gère les messages reçus */
    private async handleMessage(ws: WebSocket, message: string) {
        try {
            const { type, data }: P2PMessage = JSON.parse(message);
            console.log(`[${now()}][P2P] 📩 Message reçu: ${type}`);

            switch (type) {
                case 'NEW_BLOCK':
                    await this.handleNewBlock(data);
                    break;

                case 'NEW_TRANSACTION':
                    this.handleNewTransaction(data);
                    break;

                case 'REQUEST_LAST_BLOCK':
                    this.sendLastBlock(ws);
                    break;

                case 'REQUEST_BLOCK':
                    const blockHeight = Number(data);
                    this.sendBlock(ws, blockHeight);
                    break;

                default:
                    console.warn(`[P2P] ❓ Message inconnu: ${type}`);
            }

        } catch (error) {
            console.error(`[P2P] ❌ Erreur lors de la gestion du message`, error);
        }
    }


    /** 📤 Diffuse un nouveau block */
    broadcastBlock(block: any) {
        console.log(`[${now()}][P2P] 📢 Diffusion d'un nouveau block`);
        this.broadcast({ type: 'NEW_BLOCK', data: block });
    }


    /** 📤 Diffuse une nouvelle transaction */
    broadcastTransaction(transaction: Transaction) {
        console.log(`[${now()}][P2P] 📢 Diffusion d'une nouvelle transaction`);
        this.broadcast({ type: 'NEW_TRANSACTION', data: transaction });
    }


    /** 📤 Envoie un message à tous les peers */
    private broadcast(message: P2PMessage) {
        this.sockets.forEach(ws => ws.send(JSON.stringify(message)));
    }


    /** 🔄 Gère la réception d'un nouveau block */
    private async handleNewBlock(block: any) {
        console.log(`[${now()}][P2P] ⛓️ Nouveau block reçu`);

        if (this.blockchain.blockHeight < block.blockHeight) {
            console.log(`[${now()}][P2P] 🔄 Mise à jour de la blockchain`);

            const receipt = await this.blockchain.addBlock(block);
        }
    }


    /** 🔄 Gère la réception d'une nouvelle transaction */
    private handleNewTransaction(transaction: Transaction) {
        console.log(`[${now()}][P2P] 💰 Nouvelle transaction reçue`);

        // TODO: verifier si present dans l'index des transactions (deja minées)

        if (!this.mempool.find(tx => tx.hash === transaction.hash)) {
            // already in mempool
            return;
        }

        this.mempool.push(transaction);
    }


    /** 🔄 Envoie le dernier block à un nœud */
    private sendLastBlock(ws: WebSocket) {
        this.sendBlock(ws, this.blockchain.blockHeight);
    }


    /** 🔄 Envoie un block à un nœud */
    private sendBlock(ws: WebSocket, blockHeight: number) {
        ws.send(JSON.stringify({
            type: 'NEW_BLOCK',
            data: this.blockchain.getBlock(blockHeight)
        }));
    }
}

