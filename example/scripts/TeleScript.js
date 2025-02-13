// TeleScript.js




class TeleScript {
    #memory = memory({
        users: {},  // { address: { chats: [chatId, ...] } }
        chats: {},  // { chatId: { members: [...], admins: [...], messages: [...], isPublic: true, sessionKeys: {} } }
    });


    /** 🔹 Enregistre un utilisateur */
    registerUser() /* write */ {
        const sender = lower(caller);
        asserts(!this.#memory.users[sender], "Utilisateur déjà enregistré");
        this.#memory.users[sender] = { chats: [] };
    }


    /** 🔹 Supprime un utilisateur (libère l'espace mémoire) */
    unregisterUser() /* write */ {
        const sender = lower(caller);
        asserts(this.#memory.users[sender], "Utilisateur non enregistré");

        // 🔥 Vérifier qu'il n'est pas admin d'un chat
        for (const chatId of this.#memory.users[sender].chats) {
            const chat = this.#memory.chats[chatId];

            if (chat.admins.includes(sender)) {
                asserts(chat.admins.length > 1, "Impossible de quitter : vous êtes le seul admin du chat");
                chat.admins = chat.admins.filter(admin => admin !== sender);
            }

            // 🔥 Supprimer l'utilisateur du chat
            chat.members = chat.members.filter(member => member !== sender);

            // 🔥 Supprimer le chat si plus aucun membre
            if (chat.members.length === 0) {
                delete this.#memory.chats[chatId];
            }
        }

        // 🔥 Supprimer complètement l'utilisateur
        delete this.#memory.users[sender];
    }


    /** 🔹 Enregistre une clé de session chiffrée pour un utilisateur */
    registerSessionKey(chatId, encryptedSessionKey) /* write */ {
        const sender = lower(caller);
        const chat = this.#memory.chats[chatId];

        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.members.includes(sender), "Non autorisé");
        asserts(!chat.sessionKeys[sender], "Clé de session déjà enregistrée");

        chat.sessionKeys[sender] = encryptedSessionKey;
    }


    /** 🔹 Crée un nouveau chat privé ou de groupe */
    createChat(members, encryptedSessionKeys = {}, isPublic = false) /* write */ {
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
            sessionKeys: encryptedSessionKeys,
        };

        for (const member of uniqueMembers) {
            asserts(this.#memory.users[member], "Membre non enregistré");
            this.#memory.users[member].chats.push(chatId);
        }

        return chatId;
    }


    /** 🔹 Envoie un message chiffré dans un chat */
    sendMessage(chatId, encryptedMessage, nonce) /* write */ {
        const sender = lower(caller);
        const chat = this.#memory.chats[chatId];

        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.members.includes(sender), "Non autorisé");

        this.#memory.chats[chatId].messages.push({ sender, encryptedMessage, nonce });

        return true;
    }


    /** 🔹 Liste les messages chiffrés d'un chat */
    getMessages(chatId) {
        const sender = lower(caller);
        const chat = this.#memory.chats[chatId];

        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.members.includes(sender), "Non autorisé");

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

        // Seuls les admins peuvent exclure quelqu’un (sauf si c'est lui-même)
        if (sender !== memberToRemoveLower) {
            asserts(chat.admins.includes(sender), "Seuls les admins peuvent retirer un membre");
        }

        // Retirer le membre du chat et sa clé
        chat.members = chat.members.filter(member => member !== memberToRemoveLower);
        delete chat.sessionKeys[memberToRemoveLower];

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

        // Suppression automatique des chats fantômes
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
        const newAdminLower = lower(newAdmin);
        const chat = this.#memory.chats[chatId];

        asserts(this.#memory.users[sender], "Utilisateur non enregistré");
        asserts(this.#memory.users[newAdminLower], "Admin non enregistré");
        asserts(chat, "Chat introuvable");
        asserts(chat.admins.includes(sender), "Seuls les admins peuvent promouvoir un membre");
        asserts(chat.members.includes(newAdminLower), "Cet utilisateur n'est pas dans le chat");
        asserts(!chat.admins.includes(newAdminLower), "Déjà admin");

        chat.admins.push(newAdminLower);
    }


    getSessionKey(chatId, userAddress) {
        const sender = lower(caller);
        const chat = this.#memory.chats[chatId];
        const user = lower(userAddress);

        asserts(chat, "Chat introuvable");
        asserts(chat.members.includes(sender), "Non autorisé");
        asserts(chat.members.includes(user), "Utilisateur non trouvé dans ce chat");

        return chat.sessionKeys[user]; // Retourne la clé de session chiffrée pour cet utilisateur
    }

}


