// p2p-turn-server.ts

import { WebSocketServer, WebSocket } from "ws";


// Objectif: faire communiquer 2 nodes etant chacun derriere un firewall distinct

// TODO: a tester et si ca fonctionne integrer P2PNode_Test dans P2PNode


type PeerInfo = {
    ws: WebSocket;
    nodeId: string;
    natIp: string;
    natPort: number;
};

const peers: Map<string, PeerInfo> = new Map();

const server = new WebSocketServer({ port: 7000 });


server.on("connection", (ws, req) => {
    const natIp = req.socket.remoteAddress ?? "unknown";
    console.log(`[Signaling] 🔗 Nouveau peer connecté depuis ${natIp}`);

    ws.on("message", (message: string) => {
        try {
            const { type, nodeId, natPort, targetNodeId } = JSON.parse(message);

            if (type === "REGISTER") {
                peers.set(nodeId, { ws, nodeId, natIp, natPort });
                console.log(`[Signaling] ✅ Peer enregistré: ${nodeId} @ ${natIp}:${natPort}`);
                return;
            }

            if (type === "REQUEST_PEER" && targetNodeId && peers.has(targetNodeId)) {
                const targetPeer = peers.get(targetNodeId);
                if (!targetPeer) return;

                // Envoie à chaque pair les infos nécessaires pour le Hole Punching
                ws.send(JSON.stringify({ type: "PEER_INFO", data: targetPeer }));
                targetPeer.ws.send(JSON.stringify({ type: "PEER_INFO", data: peers.get(nodeId) }));
            }
        } catch (err) {
            console.error("[Signaling] ❌ Erreur traitement message:", err);
        }
    });

    ws.on("close", () => {
        for (const [nodeId, peer] of peers) {
            if (peer.ws === ws) {
                peers.delete(nodeId);
                console.log(`[Signaling] 🔴 Peer déconnecté: ${nodeId}`);
                break;
            }
        }
    });
});


console.log("[Signaling] 🚀 Serveur de signalisation en écoute sur ws://0.0.0.0:7000");
