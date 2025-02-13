// TeleScript.js

// non testé. merci chatgpt


/*

# USAGE

## Enregistrement d'un utilisateur (Metamask)

const publicKey = await ethereum.request({ method: "eth_getEncryptionPublicKey", params: [walletAddress] });
await contract.registerUser(publicKey);


## Création d'un chat

const chatId = await contract.createChat(["0xBobAddress"]);
console.log("Chat créé avec l'ID :", chatId);


## Envoi d'un message chiffré

const encryptedMessage = await ethereum.request({
    method: "eth_encrypt",
    params: [toUtf8Bytes("Hello Bob"), bobPublicKey]
});
await contract.sendMessage(chatId, encryptedMessage);


## Récupération et déchiffrement des messages

const messages = await contract.getMessages(chatId);
const decryptedMessages = await Promise.all(messages.map(async ({ encryptedMessage }) => {
    return await ethereum.request({
        method: "eth_decrypt",
        params: [encryptedMessage, walletAddress]
    });
}));

console.log("Messages déchiffrés :", decryptedMessages);

*/



class TeleScript {
    #memory = memory({
        users: {},  // { address: { publicKey, chats: [chatId, ...] } }
        chats: {},  // { chatId: { members: [address1, address2, ...], admins: [address1], messages: [{ sender, encryptedMessage }], isPublic: true } }
    });


    /** 🔹 Enregistre un utilisateur avec sa clé publique */
    registerUser(publicKey) /* write */ {
        const sender = lower(caller);

        asserts(!this.#memory.users[sender], "Utilisateur déjà enregistré");
        this.#memory.users[sender] = { publicKey, chats: [] };
    }


    /** 🔹 Crée un nouveau chat privé ou de groupe */
    createChat(members, isPublic = false) /* write */ {
        const sender = lower(caller);

        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        asserts(members.length >= 1, "Un chat doit avoir au moins un membre");

        const uniqueMembers = [...new Set([...members.map(lower), sender])]; // Inclus le créateur + Suppression des doublons + normalisation

        const chatId = hash(`${sender}-${Date.now()}`);
        this.#memory.chats[chatId] = {
            members: uniqueMembers,
            admins: [sender],
            messages: [],
            isPublic,
        };

        for (const member of uniqueMembers) {
            asserts(this.#memory.users[member], "Membre non enregistré");
            this.#memory.users[member].chats.push(chatId);
        }

        return chatId;
    }


    /** 🔹 Envoie un message chiffré dans un chat */
    sendMessage(chatId, encryptedMessage) /* write */ {
        const sender = lower(caller);

        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        asserts(this.#memory.chats[chatId], "Chat introuvable");
        asserts(this.#memory.chats[chatId].members.includes(sender), "Non autorisé");

        this.#memory.chats[chatId].messages.push({ sender, encryptedMessage });

        return true;
    }


    /** 🔹 Liste les messages chiffrés d'un chat */
    getMessages(chatId) {
        const sender = lower(caller);

        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        asserts(this.#memory.chats[chatId], "Chat introuvable");
        asserts(this.#memory.chats[chatId].members.includes(sender), "Non autorisé");

        return this.#memory.chats[chatId].messages;
    }


    /** 🔹 Ajoute un membre à un chat */
    addMember(chatId, newMember) /* write */ {
        const sender = lower(caller);
        const newMemberLower = lower(newMember);
        const chat = this.#memory.chats[chatId];

        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        asserts(this.#memory.users[newMemberLower], "Le membre n'est pas enregistré");
        asserts(chat, "Chat introuvable");
        asserts(this.#memory.chats[chatId].members.includes(sender), "Seul un membre peut ajouter d'autres membres");
        asserts(!chat.members.includes(newMemberLower), "Déjà membre");

        if (!chat.isPublic) {
            asserts(chat.admins.includes(sender), "Seuls les admins peuvent ajouter des membres dans un chat privé");
        }

        chat.members.push(newMemberLower);
        this.#memory.users[newMemberLower].chats.push(chatId);
    }



    removeMember(chatId, memberToRemove) /* write */ {
        const sender = lower(caller);
        const memberToRemoveLower = lower(memberToRemove);
        const chat = this.#memory.chats[chatId];

        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        asserts(this.#memory.users[memberToRemoveLower], "Le membre n'est pas enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.members.includes(sender), "Non autorisé");
        asserts(chat.members.includes(memberToRemoveLower), "Membre non trouvé dans ce chat");

        // Interdire la suppression du dernier membre
        //asserts(chat.members.length > 1, "Impossible de supprimer le dernier membre");

        // Seuls les admins peuvent exclure quelqu’un (sauf si c'est lui-même)
        if (sender !== memberToRemoveLower) {
            asserts(chat.admins.includes(sender), "Seuls les admins peuvent retirer un membre");
        }

        // Retirer le membre du chat
        chat.members = chat.members.filter(member => member !== memberToRemoveLower);

        // Retirer le chat de la liste de l'utilisateur
        this.#memory.users[memberToRemoveLower].chats = this.#memory.users[memberToRemoveLower].chats.filter(id => id !== chatId);

        // Si un admin quitte, il perd son rôle
        chat.admins = chat.admins.filter(admin => admin !== memberToRemoveLower);
        if (chat.admins.includes(memberToRemoveLower)) {
            asserts(chat.admins.length > 1, "Impossible de supprimer le dernier admin");
        }

        // Suppression automatique des chats fantômes, pour chaque membre du chat en particulier si on est en train de supprimer le chat (en retirer le dernier membre)
        for (const user of chat.members) {
            this.#memory.users[user].chats = this.#memory.users[user].chats.filter(id => id !== chatId);
        }

        if (chat.members.length === 0) {
            delete this.#memory.chats[chatId];
        }
    }


    /** 🔹 Liste les chats d'un utilisateur */
    getUserChats() {
        const sender = lower(caller);
        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        return this.#memory.users[sender].chats;
    }


    promoteToAdmin(chatId, newAdmin) /* write */ {
        const sender = lower(caller);
        asserts(this.#memory.users[sender], "Utilisateur non enregistré");

        const newAdminLower = lower(newAdmin);
        const chat = this.#memory.chats[chatId];
        asserts(this.#memory.users[newAdminLower], "Admin non enregistré");

        asserts(chat, "Chat introuvable");
        asserts(chat.admins.includes(sender), "Seuls les admins peuvent promouvoir un membre");
        asserts(chat.members.includes(newAdminLower), "Cet utilisateur n'est pas dans le chat");
        asserts(!chat.admins.includes(newAdminLower), "Déjà admin");

        chat.admins.push(newAdminLower);
    }

}


