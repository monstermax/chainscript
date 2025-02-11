// p2p-turn-client.ts

import WebSocket, { WebSocketServer } from 'ws';
import { jsonReviver, now } from './utils';
import { P2PMessage } from './p2p';


// Objectif: faire communiquer 2 nodes etant chacun derriere un firewall distinct

// TODO: a tester et integrer dans P2PNode


/*

# Server
ts-node signaling-server.ts

# Start Clients (behind distinct firewalls)
ts-node p2p.ts --port 6001
ts-node p2p.ts --port 6002

# On Client #1
p2pNode.requestPeer("nodeId_du_deuxième_nœud");

*/


class P2PNode_Test {
    private port: number;
    private nodeId: string;
    private sockets: WebSocket[] = [];

    private signalingServerUrl = "ws://127.0.0.1:7000";
    private signalingSocket: WebSocket | null = null;
    private natIp: string | null = null;
    private natPort: number;


    constructor(port=6001) {
        this.port = port;
        this.natPort = port;
        this.nodeId = 'test';
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

        } catch (err: any) {
            console.error(`[${now()}][P2P][handleMessage] ❌ Erreur lors de la gestion du message`, err);
        }

    }


    /** 🔍 Demande à se connecter à un peer via le serveur de signalisation */
    private requestPeer(targetNodeId: string) {
        if (!this.signalingSocket || this.signalingSocket.readyState !== WebSocket.OPEN) {
            console.warn("[P2P] ❌ Serveur de signalisation non disponible");
            return;
        }

        this.signalingSocket.send(JSON.stringify({
            type: "REQUEST_PEER",
            nodeId: this.nodeId,
            targetNodeId,
        }));
    }


    /** 📡 Connexion au serveur de signalisation */
    private connectToSignalingServer() {
        this.signalingSocket = new WebSocket(this.signalingServerUrl);

        this.signalingSocket.on("open", () => {
            console.log(`[P2P] 🔗 Connecté au serveur de signalisation ${this.signalingServerUrl}`);

            // Enregistre ce nœud avec son IP NAT et son port NAT
            this.signalingSocket?.send(JSON.stringify({
                type: "REGISTER",
                nodeId: this.nodeId,
                natPort: this.natPort,
            }));
        });

        this.signalingSocket.on("message", (message: string) => {
            try {
                const { type, data } = JSON.parse(message);

                if (type === "PEER_INFO") {
                    console.log(`[P2P] 🔄 Infos reçues sur un peer:`, data);
                    this.attemptHolePunching(data);
                }

            } catch (err: any) {
                console.error(`[P2P] ❌ Erreur traitement du message`, err);
            }
        });

        this.signalingSocket.on("close", () => {
            console.warn(`[P2P] 🔴 Déconnecté du serveur de signalisation`);
            setTimeout(() => this.connectToSignalingServer(), 5000);
        });
    }



    /** 🔌 Tente une connexion directe avec Hole Punching */
    private attemptHolePunching(peerInfo: { nodeId: string; natIp: string; natPort: number }) {
        console.log(`[P2P] 🌍 Tentative de connexion Hole Punching à ${peerInfo.natIp}:${peerInfo.natPort}`);

        const ws = new WebSocket(`ws://${peerInfo.natIp}:${peerInfo.natPort}`);

        ws.on("open", () => {
            console.log(`[P2P] ✅ Connexion Hole Punching réussie avec ${peerInfo.nodeId}`);
            this.initSocket(ws);
        });

        ws.on("error", (err) => {
            console.warn(`[P2P] ❌ Échec Hole Punching avec ${peerInfo.natIp}:${peerInfo.natPort}`, err);
        });

        ws.on("close", () => {
            console.warn(`[P2P] 🔴 Connexion Hole Punching fermée avec ${peerInfo.natIp}:${peerInfo.natPort}`);
        });
    }

}