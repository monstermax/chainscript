// TeleScript.js

// A tester/debuger


class TeleScript {
    users = {};  // { address: { chats: [chatId, ...] } }
    chats = {};  // { chatId: { members: [...], admins: [...], messages: [...], isPublic: true, sessionKeys: {} } }


    /** Enregistre un utilisateur */
    registerUser() /* write */ {
        const sender = lower(caller);
        asserts(!this.users[sender], "Utilisateur déjà enregistré");
        this.users[sender] = { chats: [] };
    }


    /** Supprime un utilisateur (libère l'espace mémoire) */
    unregisterUser() /* write */ {
        const sender = lower(caller);
        asserts(this.users[sender], "Utilisateur non enregistré");

        // Vérifier qu'il n'est pas admin d'un chat
        for (const chatId of this.users[sender].chats) {
            const chat = this.chats[chatId];

            if (chat.admins.includes(sender)) {
                asserts(chat.admins.length > 1, "Impossible de quitter : vous êtes le seul admin du chat");
                chat.admins = chat.admins.filter(admin => admin !== sender);
            }

            // Supprimer l'utilisateur du chat
            chat.members = chat.members.filter(member => member !== sender);

            // Supprimer le chat si plus aucun membre
            if (chat.members.length === 0) {
                delete this.chats[chatId];
            }
        }

        // Supprimer complètement l'utilisateur
        delete this.users[sender];
    }


    /** Enregistre une clé de session chiffrée pour un utilisateur */
    registerSessionKey(chatId, encryptedSessionKey) /* write */ {
        const sender = lower(caller);
        const chat = this.chats[chatId];

        asserts(this.users[sender], "Utilisateur non enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.members.includes(sender), "Non autorisé");
        asserts(!chat.sessionKeys[sender], "Clé de session déjà enregistrée");

        chat.sessionKeys[sender] = encryptedSessionKey;
    }


    /** Crée un nouveau chat privé ou de groupe */
    createChat(encryptedSessionKeysList = '', isPublic = '') /* write */ {
        const sender = lower(caller);
        asserts(this.users[sender], "Utilisateur non enregistré");

        const encryptedSessionKeysEntries = encryptedSessionKeysList // Input format: address1:key1,address2:key2,...
            .split(',')
            .map(entry => entry.split(':').map(entry => entry.trim()))
            .filter(entry => entry.length === 2)
            .map(entry => [lower(entry[0]), entry[1]]);

        //const encryptedSessionKeysEntries = JSON.parse(encryptedSessionKeysList);
        const encryptedSessionKeys = Object.fromEntries(encryptedSessionKeysEntries);
        const members = Object.keys(encryptedSessionKeys);

        // REVERT si le créateur n'a pas sa propre clé de session
        asserts(encryptedSessionKeys[sender], "Le créateur doit avoir sa propre clé de session");


        const uniqueMembers = [...new Set([...members, sender])]; // Inclus le créateur + Suppression des doublons + normalisation

        const chatId = hash(`${sender}-${Date.now()}`);

        this.chats[chatId] = {
            members: uniqueMembers,
            admins: [sender],
            messages: [],
            isPublic: !!isPublic,
            sessionKeys: encryptedSessionKeys,
        };

        for (const member of uniqueMembers) {
            asserts(this.users[member], "Membre non enregistré");
            this.users[member].chats.push(chatId);
        }

        return chatId;
    }


    /** Envoie un message chiffré dans un chat */
    sendMessage(chatId, encryptedMessage, nonce) /* write */ {
        const sender = lower(caller);
        const chat = this.chats[chatId];

        asserts(this.users[sender], "Utilisateur non enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.members.includes(sender), "Non autorisé");
        asserts(encryptedMessage.length > 0, "Message vide");
        asserts(nonce.length > 0, "Nonce manquant");

        this.chats[chatId].messages.push({ sender, encryptedMessage, nonce });

        return true;
    }


    /** Liste les messages chiffrés d'un chat */
    getMessages(chatId, userAddress, limit="100", offset="0") {
        const user = lower(userAddress);
        const chat = this.chats[chatId];
        limit = Number(limit) || 100;
        offset = Number(offset) || 0;

        asserts(this.users[user], "Utilisateur non enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.members.includes(user), "Non autorisé");

        return [...chat.messages].reverse().slice(offset, limit);
    }


    /** Ajoute un membre à un chat */
    addMember(chatId, newMember, encryptedSessionKey) /* write */ {
        const sender = lower(caller);
        const newMemberLower = lower(newMember);
        const chat = this.chats[chatId];

        asserts(this.users[sender], "Utilisateur non enregistré");
        asserts(this.users[newMemberLower], "Le membre n'est pas enregistré");
        asserts(chat, "Chat introuvable");
        asserts(this.chats[chatId].members.includes(sender), "Seul un membre peut ajouter d'autres membres");
        asserts(!chat.members.includes(newMemberLower), "Déjà membre");
        asserts(encryptedSessionKey, "La clé de session chiffrée est requise");

        if (!chat.isPublic) {
            asserts(chat.admins.includes(sender), "Seuls les admins peuvent ajouter des membres dans un chat privé");
        }

        chat.members.push(newMemberLower);
        chat.sessionKeys[newMemberLower] = encryptedSessionKey;
        this.users[newMemberLower].chats.push(chatId);
    }



    removeMember(chatId, memberToRemove) /* write */ {
        const sender = lower(caller);
        const memberToRemoveLower = lower(memberToRemove);
        const chat = this.chats[chatId];

        asserts(this.users[sender], "Utilisateur non enregistré");
        asserts(this.users[memberToRemoveLower], "Le membre n'est pas enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.members.includes(sender), "Non autorisé");
        asserts(chat.members.includes(memberToRemoveLower), "Membre non trouvé dans ce chat");

        // Seuls les admins peuvent exclure quelqu’un (sauf si c'est lui-même)
        if (sender !== memberToRemoveLower) {
            asserts(chat.admins.includes(sender), "Seuls les admins peuvent retirer un membre");
        }

        // Retirer le membre du chat et sa clé
        chat.members = chat.members.filter(member => member !== memberToRemoveLower);
        delete chat.sessionKeys[memberToRemoveLower];

        // Retirer le chat de la liste de l'utilisateur
        this.users[memberToRemoveLower].chats = this.users[memberToRemoveLower].chats.filter(id => id !== chatId);

        // Si un admin quitte, il perd son rôle
        chat.admins = chat.admins.filter(admin => admin !== memberToRemoveLower);
        if (chat.admins.includes(memberToRemoveLower)) {
            asserts(chat.admins.length > 1, "Impossible de supprimer le dernier admin");
        }

        // Suppression automatique des chats fantômes, pour chaque membre du chat en particulier si on est en train de supprimer le chat (en retirer le dernier membre)
        for (const user of chat.members) {
            this.users[user].chats = this.users[user].chats.filter(id => id !== chatId);
        }

        // Suppression automatique des chats fantômes
        if (chat.members.length === 0) {
            delete this.chats[chatId];
        }
    }


    /** Liste les chats d'un utilisateur */
    getUserChats(userAddress) {
        //const sender = lower(caller);
        const user = lower(userAddress);
        //asserts(this.users[sender], "Utilisateur non enregistré");
        asserts(this.users[user], "Utilisateur non enregistré");
        return this.users[user].chats;
    }


    promoteToAdmin(chatId, newAdmin) /* write */ {
        const sender = lower(caller);
        const newAdminLower = lower(newAdmin);
        const chat = this.chats[chatId];

        asserts(this.users[sender], "Utilisateur non enregistré");
        asserts(this.users[newAdminLower], "Admin non enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.admins.includes(sender), "Seuls les admins peuvent promouvoir un membre");
        asserts(chat.members.includes(newAdminLower), "Cet utilisateur n'est pas dans le chat");
        asserts(!chat.admins.includes(newAdminLower), "Déjà admin");

        chat.admins.push(newAdminLower);
    }


    getSessionKey(chatId, userAddress) {
        //const sender = lower(caller);
        const chat = this.chats[chatId];
        const user = lower(userAddress);

        asserts(chat, "Chat introuvable");
        //asserts(chat.members.includes(sender), "Non autorisé");
        asserts(chat.members.includes(user), "Utilisateur non trouvé dans ce chat");

        return chat.sessionKeys[user]; // Retourne la clé de session chiffrée pour cet utilisateur
    }

}


