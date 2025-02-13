<!-- # TeleScript.md -->


# Générer et chiffrer la sessionKey pour chaque membre (d'un chat)

```js
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

// 1️⃣ Générer une clé de session unique pour le chat (32 bytes)
const sessionKey = nacl.randomBytes(32);

// 2️⃣ Fonction pour chiffrer la clé de session pour un destinataire
function encryptSessionKey(sessionKey, recipientPublicKey) {
    const nonce = nacl.randomBytes(24);
    const encryptedKey = nacl.box(sessionKey, nonce, recipientPublicKey, myPrivateKey);
    return { encryptedKey: naclUtil.encodeBase64(encryptedKey), nonce: naclUtil.encodeBase64(nonce) };
}

// 3️⃣ Récupérer les clés publiques des membres et chiffrer la sessionKey pour chacun
const members = ["0xAlice", "0xBob"];
const encryptedSessionKeys = {};
for (const member of members) {
    const memberPublicKey = await contract.getUserPublicKey(member);
    const { encryptedKey, nonce } = encryptSessionKey(sessionKey, memberPublicKey);
    encryptedSessionKeys[member] = { encryptedKey, nonce };
}

// 4️⃣ Créer le chat avec la sessionKey chiffrée et isPublic=false par défaut
const chatId = await contract.createChat(members, encryptedSessionKeys, false);
console.log("✅ Chat créé avec l'ID :", chatId);
```



# Déchiffrement de la clé de session

```js
// 1️⃣ Récupérer la clé de session chiffrée depuis la blockchain
const { encryptedKey, nonce } = await contract.getSessionKey(chatId, myWalletAddress);

// 2️⃣ Fonction pour déchiffrer la clé de session avec `nacl.box.open`
function decryptSessionKey(encryptedKey, nonce, senderPublicKey) {
    const decryptedKey = nacl.box.open(
        naclUtil.decodeBase64(encryptedKey),
        naclUtil.decodeBase64(nonce),
        senderPublicKey,
        myPrivateKey
    );

    if (!decryptedKey) {
        throw new Error("❌ Erreur : Impossible de déchiffrer la clé de session !");
    }

    return decryptedKey;
}

// 3️⃣ Obtenir la sessionKey déchiffrée
const sessionKey = decryptSessionKey(encryptedKey, nonce, chatCreatorPublicKey);
console.log("✅ Clé de session récupérée :", sessionKey);
```




# Chiffrer un message et l’envoyer

```js
// 1️⃣ Fonction pour chiffrer un message avec la sessionKey
function encryptMessage(message, sessionKey) {
    if (!sessionKey || sessionKey.length !== 32) {
        throw new Error("❌ SessionKey invalide !");
    }

    const nonce = nacl.randomBytes(24);
    const encryptedMessage = nacl.secretbox(naclUtil.decodeUTF8(message), nonce, sessionKey);
    return { encryptedMessage: naclUtil.encodeBase64(encryptedMessage), nonce: naclUtil.encodeBase64(nonce) };
}

// 2️⃣ Chiffrer le message
const message = "Hello Bob";
const { encryptedMessage, nonce } = encryptMessage(message, sessionKey);

// 3️⃣ Envoyer le message chiffré
await contract.sendMessage(chatId, encryptedMessage, nonce);
```



# Lire et déchiffrer les messages 

```js
// 1️⃣ Fonction pour déchiffrer un message avec la sessionKey
function decryptMessage(encryptedMessage, nonce, sessionKey) {
    if (!sessionKey || sessionKey.length !== 32) {
        throw new Error("❌ SessionKey invalide !");
    }

    const decrypted = nacl.secretbox.open(naclUtil.decodeBase64(encryptedMessage), naclUtil.decodeBase64(nonce), sessionKey);

    if (!decrypted) {
        throw new Error("❌ Erreur de déchiffrement du message !");
    }

    return naclUtil.encodeUTF8(decrypted);
}

// 2️⃣ Récupérer les messages chiffrés depuis la blockchain
const messages = await contract.getMessages(chatId);

// 3️⃣ Déchiffrer les messages avec la sessionKey
const decryptedMessages = messages.map(({ encryptedMessage, nonce }) => decryptMessage(encryptedMessage, nonce, sessionKey));

console.log("✅ Messages déchiffrés :", decryptedMessages);
```

