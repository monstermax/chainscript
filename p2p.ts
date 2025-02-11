// p2p.ts

import crypto from 'crypto';

import WebSocket, { WebSocketServer } from 'ws';

import { jsonReplacer, jsonReviver, now } from './utils';
import { Blockchain } from './blockchain';
import { Transaction } from './transaction';
import { Block } from './block';
import { BlockData, BlockHash, BlockReceipt } from './types/block.types';


/* ######################################################### */

type MessageType = 'NODE_METADATA' | 'NODE_METADATA_ACK' | 'NEW_BLOCK' | 'NEW_TRANSACTION' | 'REQUEST_BLOCK';


type P2PMessage = {
    type: MessageType;
    data: any;
}


type Peer = {
    ws: WebSocket;
    metadata?: PeerMetadata;
}

type PeerMetadata = {
    chainId: number;
    nodeId: string;
    nodeVersion: string;
    blockHeight: number;
    blockHash: BlockHash;
}

type Peers = {[nodeId: string]: Peer};


/* ######################################################### */


const initialPeers = [
    "127.0.0.1:6001",
    "127.0.0.1:6002",
    "127.0.0.1:6003",
    //"127.0.0.1:6004",
    //"127.0.0.1:6005",
];

/* ######################################################### */


export class P2PNode {
    private blockchain: Blockchain;
    private mempool: Transaction[];
    private sockets: WebSocket[] = [];
    private port: number;
    private nodeId: string;
    private nodeVersion: string = "1.0.0";
    private chainId: number;
    private peers: Peers = {};
    private peersMaxBlockHeight: number = 0; // Hauteur max connue parmi les peers
    private blockSyncQueue: Set<number> = new Set(); // Liste des blocks à récupérer
    private activeRequests: Set<number> = new Set(); // Blocks en attente de réponse
    private isSyncing = false;



    constructor(blockchain: Blockchain, port=6001) {
        this.blockchain = blockchain;
        this.mempool = [];
        this.port = port;

        // Génère un nodeId unique
        this.nodeId = this.generateNodeId();
        this.chainId = blockchain.getChainId();

        this.startServer();
    }


    /** 🎲 Génère un ID unique pour ce nœud */
    private generateNodeId(): string {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID(); // Méthode moderne (Node.js 14+)
        }

        return `node-${Date.now()}-${Math.floor(Math.random() * 1e6)}`; // Fallback pour les anciennes versions
    }


    /** 📡 Démarre un nœud WebSocket */
    startServer() {
        const server = new WebSocketServer({ port: this.port });

        server.on('connection', (ws) => {
            console.log(`[${now()}][P2P][startServer] 🌐 Nouvelle connexion`);
            this.initSocket(ws);
        });

        console.log(`[${now()}][P2P][startServer] 🚀 Serveur P2P démarré sur ws://0.0.0.0:${this.port}`);


        this.connectToInitialPeers();
    }


    /** 🌍 Connecte aux peers initiaux */
    private connectToInitialPeers() {
        initialPeers.forEach(peer => {
            if (peer === `127.0.0.1:${this.port}`) {
                return; // pas de connexion à sois-meme
            }

            if (!this.sockets.find(s => s.url === `ws://${peer}`)) {
                console.log(`[${now()}][P2P][connectToInitialPeers] 🛰️ Tentative de connexion à ${peer}`);
                this.connectToPeer(`ws://${peer}`);
            }
        });
    }



    /** 🌍 Se connecte à un autre nœud */
    connectToPeer(peerUrl: string) {
        const ws = new WebSocket(peerUrl);

        ws.on('open', () => {
            console.log(`[${now()}][P2P][connectToPeer] 🔗 Connecté à ${peerUrl}`);
            this.initSocket(ws);

            this.sendMyMetadata(ws);
        });

        ws.on('error', (err) => console.error(`[${now()}][P2P][connectToPeer] ❌ Erreur de connexion :`, err));
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
            const { type, data }: P2PMessage = JSON.parse(message, jsonReviver);

            console.log(`[${now()}][P2P][handleMessage] 📩 Message reçu: ${type}`);

            switch (type) {
                case 'NODE_METADATA':
                    this.validatePeer(ws, data);
                    break;

                case 'NODE_METADATA_ACK':
                    this.validatePeer(ws, data, true);
                    break;

                case 'NEW_BLOCK':
                    await this.handleNewBlock(data);
                    break;

                case 'NEW_TRANSACTION':
                    this.handleNewTransaction(data);
                    break;

                case 'REQUEST_BLOCK':
                    const blockHeight = Number(data);
                    this.sendBlock(ws, blockHeight);
                    break;

                default:
                    console.warn(`[${now()}][P2P][handleMessage] ❓ Message inconnu: ${type}`);
            }

        } catch (error) {
            console.error(`[${now()}][P2P][handleMessage] ❌ Erreur lors de la gestion du message`, error);
        }
    }


    /** 📤 Envoie les métadonnées du nœud à un peer */
    private sendMyMetadata(ws: WebSocket, isAcknowledge=false) {
        const message: P2PMessage = {
            type: isAcknowledge ? 'NODE_METADATA_ACK' : 'NODE_METADATA',
            data: {
                nodeId: this.nodeId,
                nodeVersion: this.nodeVersion,
                chainId: this.chainId,
                blockHeight: this.blockchain.blockHeight,
                blockHash: this.blockchain.stateManager.blocksIndex.at(-1),
            }
        };

        ws.send(JSON.stringify(message, jsonReplacer));
    }


    /** ✅ Vérifie si un peer est compatible avant d'autoriser la connexion */
    private validatePeer(ws: WebSocket, metadata: PeerMetadata, isAcknowledge = false) {
        console.log(`[${now()}][P2P][validatePeer] 🔍 Vérification des métadonnées du peer`, metadata);

        if (metadata.chainId !== this.chainId) {
            console.warn(`[${now()}][P2P][validatePeer] ❌ Rejeté: Chain ID incompatible (${metadata.chainId} ≠ ${this.chainId})`);
            ws.close();
            return;
        }


        const peerHighestBlock = this.blockchain.getBlock(metadata.blockHeight);
        if (! peerHighestBlock || peerHighestBlock.hash !== metadata.blockHash) {
            console.warn(`[${now()}][P2P][validatePeer] ❌ Rejeté: blockHash incompatible (${metadata.blockHash} ≠ ${peerHighestBlock?.hash})`);
            ws.close();
            return;
        }


        console.log(`[${now()}][P2P][validatePeer] ✅ Peer accepté (${metadata.nodeId}, v${metadata.nodeVersion}, h${metadata.blockHeight})`);


        if (! this.peers[metadata.nodeId]) {
            this.peers[metadata.nodeId] = { ws, metadata };
        }


        if (!isAcknowledge) {
            this.sendMyMetadata(ws, true);
        }

        // Met à jour la hauteur max connue
        if (metadata.blockHeight > this.peersMaxBlockHeight) {
            this.peersMaxBlockHeight = metadata.blockHeight;
            this.startBlockchainSync();
        }
    }


    /** 🔄 Démarre la synchronisation des blocks manquants */
    private startBlockchainSync() {
        if (this.isSyncing) return;

        this.isSyncing = true;
        const localHeight = this.blockchain.blockHeight;

        console.log(`[${now()}][P2P][startBlockchainSync] 🔄 Début de la reconstruction. LocalHeight=${localHeight}, PeersMaxHeight=${this.peersMaxBlockHeight}`);

        for (let height = localHeight + 1; height <= this.peersMaxBlockHeight; height++) {
            if (!this.blockSyncQueue.has(height) && !this.activeRequests.has(height)) {
                this.blockSyncQueue.add(height);
            }
        }

        this.processBlockSyncQueue();
    }


    /** 🔄 Traite la file d'attente des blocks manquants */
    private processBlockSyncQueue() {
        if (this.blockSyncQueue.size === 0) {
            console.log(`[${now()}][P2P][processBlockSyncQueue] ✅ Synchronisation terminée.`);
            return;
        }

        const maxRequests = Object.keys(this.peers).length;
        let requestsSent = 0;

        for (const blockHeight of [...this.blockSyncQueue]) {
            if (this.activeRequests.has(blockHeight)) continue; // Déjà en attente

            const availablePeers = Object.values(this.peers).filter(peer => !this.activeRequests.has(blockHeight));
            if (availablePeers.length === 0) {
                console.warn(`[${now()}][P2P][processBlockSyncQueue] ⚠️ Aucun peer disponible pour le block ${blockHeight}`);
                continue;
            }

            const chosenPeer = availablePeers[Math.floor(Math.random() * availablePeers.length)]; // Peer aléatoire dispo
            this.activeRequests.add(blockHeight);
            this.blockSyncQueue.delete(blockHeight);

            console.log(`[${now()}][P2P][processBlockSyncQueue] 📡 Demande du block ${blockHeight} à ${chosenPeer.metadata!.nodeId}`);

            const message: P2PMessage = {
                type: 'REQUEST_BLOCK',
                data: blockHeight,
            };

            chosenPeer.ws.send(JSON.stringify(message, jsonReplacer));

            requestsSent++;

            if (requestsSent >= maxRequests) {
                break;
            }
        }
    }


    /** 📤 Diffuse un nouveau block */
    broadcastBlock(block: Block) {
        console.log(`[${now()}][P2P][broadcastBlock] 📢 Diffusion d'un nouveau block`);
        this.broadcast({ type: 'NEW_BLOCK', data: block.toData() });
    }


    /** 📤 Diffuse une nouvelle transaction */
    broadcastTransaction(transaction: Transaction) {
        console.log(`[${now()}][P2P][broadcastTransaction] 📢 Diffusion d'une nouvelle transaction`);
        this.broadcast({ type: 'NEW_TRANSACTION', data: transaction.toData() });
    }


    /** 📤 Envoie un message à tous les peers */
    private broadcast(message: P2PMessage) {
        this.sockets.forEach(ws => ws.send(JSON.stringify(message, jsonReplacer)));
    }


    /** 🔄 Gère la réception d'un nouveau block */
    private async handleNewBlock(blockData: BlockData) {
        const localHeight = this.blockchain.blockHeight;

        console.log('blockData:', blockData)

        console.log(`[${now()}][P2P][handleNewBlock] ⛓️ Nouveau block reçu ${blockData.blockHeight} (expected: ${localHeight + 1})`);

        const block: Block = Block.from(blockData);
        console.log('block Data:', block.toData()); // DEBUG


        if (block.blockHeight === localHeight + 1) {
            // ✅ Ajout direct du block suivant
            console.log(`[${now()}][P2P] 📥 Ajout immédiat du block`);
            const blockReceipt: BlockReceipt = await this.blockchain.addExistingBlock(block);

            this.activeRequests.delete(block.blockHeight);
            this.processBlockSyncQueue();

            if (block.blockHeight >= this.peersMaxBlockHeight) {
                this.peersMaxBlockHeight = block.blockHeight;
                this.isSyncing = false;
            }

            return;
        }

        if (blockData.blockHeight > localHeight + 1 && blockData.blockHeight < localHeight + 100) {
            // 🔄 Stocke le bloc manquant dans la file et continue la sync
            this.blockSyncQueue.add(blockData.blockHeight);
            console.log(`[${now()}][P2P][handleNewBlock] 🔄 Block ${blockData.blockHeight} ajouté à la file d'attente`);
        }
    }


    /** 🔄 Gère la réception d'une nouvelle transaction */
    private handleNewTransaction(transaction: Transaction) {
        console.log(`[${now()}][P2P][handleNewTransaction] 💰 Nouvelle transaction reçue`);

        // TODO: verifier si present dans l'index des transactions (deja minées)

        if (!this.mempool.find(tx => tx.hash === transaction.hash)) {
            // already in mempool
            return;
        }

        this.mempool.push(transaction);
    }


    /** 🔄 Envoie un block à un peer */
    private sendBlock(ws: WebSocket, blockHeight: number) {
        const block = this.blockchain.getBlock(blockHeight);
        if (!block) return;

        console.log(`[${now()}][P2P][sendBlock] 📤 Envoi du block ${blockHeight} à un peer`);

        const message: P2PMessage = {
            type: 'NEW_BLOCK',
            data: block.toData()
        };

        ws.send(JSON.stringify(message, jsonReplacer));

        this.activeRequests.delete(blockHeight); // Libère la requête après envoi
    }


}

