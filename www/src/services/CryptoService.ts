// CryptoService.ts

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';


// Clés à stocker dans localStorage
interface StoredKeys {
    publicKey: string;
    secretKey: string;
    channelKeys: Record<string, string>; // chatId: base64 encodedChannelKey
}


export function saveKeyPair(keyPair: nacl.BoxKeyPair) {
    const storedKeys: StoredKeys = {
        publicKey: naclUtil.encodeBase64(keyPair.publicKey),
        secretKey: naclUtil.encodeBase64(keyPair.secretKey),
        channelKeys: {}
    };

    localStorage.setItem('teleScriptKeys', JSON.stringify(storedKeys));
}


/** Récupère les clés depuis le localStorage */
export function getStoredKeyPair(): {
    keyPair: nacl.BoxKeyPair | null,
    channelKeys: Record<string, string>
} {
    const storedKeysJson = localStorage.getItem('teleScriptKeys');
    if (!storedKeysJson) return { keyPair: null, channelKeys: {} };

    const storedKeys: StoredKeys = JSON.parse(storedKeysJson);

    return {
        keyPair: {
            publicKey: naclUtil.decodeBase64(storedKeys.publicKey),
            secretKey: naclUtil.decodeBase64(storedKeys.secretKey)
        },
        channelKeys: storedKeys.channelKeys || {},
    };
}


/** Sauvegarde les clés dans le localStorage */
export function saveChannelKey(chatId: string, channelKey: Uint8Array) {
    const storedKeysJson = localStorage.getItem('teleScriptKeys');
    if (!storedKeysJson) return;

    const storedKeys: StoredKeys = JSON.parse(storedKeysJson);

    // Initialiser channelKeys s'il n'existe pas
    storedKeys.channelKeys = storedKeys.channelKeys || {};

    // Stocker la clé de canal
    storedKeys.channelKeys[chatId] = naclUtil.encodeBase64(channelKey);

    localStorage.setItem('teleScriptKeys', JSON.stringify(storedKeys));
}


export function getChannelKey(chatId: string): Uint8Array | null {
    const storedKeysJson = localStorage.getItem('teleScriptKeys');
    if (!storedKeysJson) return null;

    const storedKeys: StoredKeys = JSON.parse(storedKeysJson);

    // S'assurer que channelKeys existe
    const channelKeys = storedKeys.channelKeys || {};
    const channelKeyBase64 = channelKeys[chatId];

    return channelKeyBase64 ? naclUtil.decodeBase64(channelKeyBase64) : null;
}


export function generateKeyPair(): nacl.BoxKeyPair {
    const keyPair = nacl.box.keyPair();

    // Vérifier s'il existe déjà des clés stockées
    const existingKeys = getStoredKeyPair();

    // Ne générer et sauvegarder que s'il n'y a pas de clés existantes
    if (!existingKeys.keyPair) {
        saveKeyPair(keyPair);
    }

    return keyPair;
}


export function generateChannelKey(): Uint8Array {
    return nacl.randomBytes(32);
}


export function encryptMessage(message: string, channelKey: Uint8Array): {
    encryptedMessage: string;
    nonce: string
} {
    const nonce = nacl.randomBytes(24);
    const encryptedMessage = nacl.secretbox(
        naclUtil.decodeUTF8(message),
        nonce,
        channelKey
    );

    return {
        encryptedMessage: naclUtil.encodeBase64(encryptedMessage),
        nonce: naclUtil.encodeBase64(nonce)
    };
}


export function decryptMessage(
    encryptedMessage: string,
    nonce: string,
    channelKey: Uint8Array
): string {
    const decryptedMessage = nacl.secretbox.open(
        naclUtil.decodeBase64(encryptedMessage),
        naclUtil.decodeBase64(nonce),
        channelKey
    );

    if (!decryptedMessage) {
        throw new Error("Message decryption failed");
    }

    return naclUtil.encodeUTF8(decryptedMessage);
}


export function encryptChannelKeyForMembers(
    channelKey: Uint8Array,
    memberAddresses: string[],
    memberPublicKeys: string[],
    keyPair: nacl.BoxKeyPair
) {

    console.log('memberAddresses:', memberAddresses);
    console.log('memberPublicKeys:', memberPublicKeys);

    return memberAddresses.map((address, index) => {
        console.log('index:', index)
        console.log('member address:', address)

        const publicKey = memberPublicKeys[index];
        console.log('member publicKey:', publicKey)

        const recipientPublicKey = naclUtil.decodeBase64(publicKey);
        const nonce = nacl.randomBytes(24);

        const encryptedKey = nacl.box(
            channelKey,
            nonce,
            recipientPublicKey,
            keyPair.secretKey
        );

        return `${address}:${naclUtil.encodeBase64(encryptedKey)}:${naclUtil.encodeBase64(nonce)}`;
    }).join(',');
}

