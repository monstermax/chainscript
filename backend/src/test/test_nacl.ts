// test_nacl.ts

import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";


// 🔑 Générer une paire de clés Curve25519
function generateKeyPair(): nacl.BoxKeyPair {
    return nacl.box.keyPair();
}

// 🔑 Générer une clé de canal (clé partagée)
function generateChannelKey(): Uint8Array {
    return nacl.randomBytes(32); // Clé symétrique de 32 bytes
}

// 🔒 Chiffrer la clé de canal pour un participant
function encryptChannelKey(
    channelKey: Uint8Array,
    recipientPublicKey: Uint8Array,
    senderPrivateKey: Uint8Array
): { encryptedKey: string; nonce: string } {
    const nonce = nacl.randomBytes(24);
    const encryptedKey = nacl.box(channelKey, nonce, recipientPublicKey, senderPrivateKey);
    if (!encryptedKey) {
        throw new Error("Encryption failed");
    }
    return {
        encryptedKey: naclUtil.encodeBase64(encryptedKey),
        nonce: naclUtil.encodeBase64(nonce),
    };
}

// 🔓 Déchiffrer la clé de canal par un participant
function decryptChannelKey(
    encryptedKey: string,
    nonce: string,
    senderPublicKey: Uint8Array,
    recipientPrivateKey: Uint8Array
): Uint8Array {
    const decryptedKey = nacl.box.open(
        naclUtil.decodeBase64(encryptedKey),
        naclUtil.decodeBase64(nonce),
        senderPublicKey,
        recipientPrivateKey
    );
    if (!decryptedKey) {
        throw new Error("Decryption failed");
    }
    return decryptedKey;
}

// ✉️ Chiffrer un message avec la clé de canal
function encryptMessage(message: string, channelKey: Uint8Array): { encryptedMessage: string; nonce: string } {
    const nonce = nacl.randomBytes(24);
    const encryptedMessage = nacl.secretbox(naclUtil.decodeUTF8(message), nonce, channelKey);
    return {
        encryptedMessage: naclUtil.encodeBase64(encryptedMessage),
        nonce: naclUtil.encodeBase64(nonce),
    };
}

// ✉️ Déchiffrer un message avec la clé de canal
function decryptMessage(encryptedMessage: string, nonce: string, channelKey: Uint8Array): string {
    const decryptedMessage = nacl.secretbox.open(
        naclUtil.decodeBase64(encryptedMessage),
        naclUtil.decodeBase64(nonce),
        channelKey
    );
    if (!decryptedMessage) {
        throw new Error("Decryption failed");
    }
    return naclUtil.encodeUTF8(decryptedMessage);
}

// 🚀 Scénario pour un canal de discussion avec clé partagée
async function main() {
    // 1. Générer des paires de clés pour l'expéditeur et les participants
    const adminKeyPair = generateKeyPair(); // Administrateur du canal
    const participants = [
        generateKeyPair(), // Participant 1
        generateKeyPair(), // Participant 2
        generateKeyPair(), // Participant 3
    ];

    console.log("🔑 Admin - Clé publique:", naclUtil.encodeBase64(adminKeyPair.publicKey));
    participants.forEach((participant, index) => {
        console.log(`🔑 Participant ${index + 1} - Clé publique:`, naclUtil.encodeBase64(participant.publicKey));
    });

    // 2. Générer une clé de canal (clé partagée)
    const channelKey = generateChannelKey();
    console.log("🔑 Clé de canal:", naclUtil.encodeBase64(channelKey));

    // 3. Chiffrer la clé de canal pour chaque participant
    const encryptedChannelKeys = participants.map((participant) => {
        return encryptChannelKey(channelKey, participant.publicKey, adminKeyPair.secretKey);
    });
    console.log("🔒 Clés de canal chiffrées:", encryptedChannelKeys);

    // 4. Chiffrer un message avec la clé de canal
    const message = "Hello, ceci est un message pour le canal!";
    const { encryptedMessage, nonce: messageNonce } = encryptMessage(message, channelKey);
    console.log("✉️ Message chiffré:", encryptedMessage);
    console.log("✉️ Nonce du message:", messageNonce);

    // 5. Envoyer les données chiffrées aux participants
    const encryptedData = {
        encryptedMessage,
        messageNonce,
        adminPublicKey: naclUtil.encodeBase64(adminKeyPair.publicKey),
        encryptedChannelKeys,
    };

    // 6. Chaque participant déchiffre la clé de canal et le message
    participants.forEach((participant, index) => {
        const decryptedChannelKey = decryptChannelKey(
            encryptedData.encryptedChannelKeys[index].encryptedKey,
            encryptedData.encryptedChannelKeys[index].nonce,
            naclUtil.decodeBase64(encryptedData.adminPublicKey),
            participant.secretKey
        );
        console.log(`🔓 Participant ${index + 1} - Clé de canal déchiffrée:`, naclUtil.encodeBase64(decryptedChannelKey));

        const decryptedMessage = decryptMessage(
            encryptedData.encryptedMessage,
            encryptedData.messageNonce,
            decryptedChannelKey
        );
        console.log(`📨 Participant ${index + 1} - Message déchiffré:`, decryptedMessage);
    });
}


// Lancer le scénario
main().catch((error) => console.error("Erreur:", error));