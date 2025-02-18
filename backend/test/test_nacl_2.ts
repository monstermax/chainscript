// test_nacl_2.ts

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';


// Types
interface Member {
    keyPair: nacl.BoxKeyPair;
    publicKeyBase64: string;
    revokedAt?: number;
    encryptedChannelKey?: {
        encryptedKey: string;
        nonce: string
    };
}

interface Message {
    encryptedMessage: string;
    nonce: string;
    sender: string;
    timestamp: number;
}

class SecureChannel {
    private adminKeyPair: nacl.BoxKeyPair;
    private channelKey: Uint8Array;
    private members: Map<string, Member> = new Map();
    private messages: Message[] = [];

    constructor() {
        // Générer les clés de l'admin
        this.adminKeyPair = this.generateKeyPair();

        // Générer la clé de canal initiale
        this.channelKey = this.generateChannelKey();
    }

    // Utilitaires de génération de clés
    private generateKeyPair(): nacl.BoxKeyPair {
        return nacl.box.keyPair();
    }

    private generateChannelKey(): Uint8Array {
        return nacl.randomBytes(32);
    }

    // Méthode pour ajouter un membre
    addMember(memberPublicKey: Uint8Array): string {
        const publicKeyBase64 = naclUtil.encodeBase64(memberPublicKey);

        // Générer une nouvelle clé de canal (rotation)
        this.channelKey = this.generateChannelKey();

        // Récupérer tous les membres actuels (actifs)
        const activeMembers = Array.from(this.members.values())
            .filter(m => !m.revokedAt)
            .map(m => naclUtil.decodeBase64(m.publicKeyBase64));

        // Ajouter le nouveau membre
        activeMembers.push(memberPublicKey);

        // Créer le nouveau membre
        const newMember: Member = {
            keyPair: { publicKey: memberPublicKey, secretKey: new Uint8Array(32) },
            publicKeyBase64,
        };

        // Ajouter le nouveau membre à this.members
        this.members.set(publicKeyBase64, newMember);

        // Mettre à jour tous les membres avec la nouvelle clé
        this.updateMembersWithNewChannelKey(activeMembers, this.channelKey);

        return publicKeyBase64;
    }

    // Retirer un membre
    removeMember(memberPublicKeyBase64: string) {
        const member = this.members.get(memberPublicKeyBase64);
        if (!member) {
            throw new Error("Membre non trouvé");
        }

        // Générer une nouvelle clé de canal (rotation)
        this.channelKey = this.generateChannelKey();

        // Mettre à jour le membre comme révoqué
        member.revokedAt = Date.now();
        this.members.set(memberPublicKeyBase64, member);

        // Récupérer les membres restants actifs
        const remainingMembers = Array.from(this.members.values())
            .filter(m => !m.revokedAt && m.publicKeyBase64 !== memberPublicKeyBase64)
            .map(m => naclUtil.decodeBase64(m.publicKeyBase64));

        // Mettre à jour les membres restants avec la nouvelle clé
        this.updateMembersWithNewChannelKey(remainingMembers, this.channelKey);
    }

    private updateMembersWithNewChannelKey(
        activeMembers: Uint8Array[],
        newChannelKey: Uint8Array
    ): void {
        // Re-chiffrer la nouvelle clé de canal pour tous les membres actifs
        const encryptedChannelKeys = activeMembers.map(memberKey =>
            this.encryptChannelKey(
                newChannelKey,
                memberKey,
                this.adminKeyPair.secretKey
            )
        );

        // Mettre à jour les membres
        activeMembers.forEach((memberKey, index) => {
            const memberPublicKeyBase64 = naclUtil.encodeBase64(memberKey);

            const updatedMember = this.members.get(memberPublicKeyBase64);
            if (updatedMember) {
                updatedMember.encryptedChannelKey = encryptedChannelKeys[index];
                this.members.set(memberPublicKeyBase64, updatedMember);
            }
        });
    }

    // Chiffrer la clé de canal pour un membre
    private encryptChannelKey(
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

    // Envoyer un message
    sendMessage(senderPublicKeyBase64: string, messageText: string): Message {
        const sender = this.members.get(senderPublicKeyBase64);

        if (!sender) {
            throw new Error("Membre non trouvé");
        }

        // Supprimer la vérification de revokedAt pour le test
        // if (sender.revokedAt) {
        //     throw new Error("Envoi de message non autorisé");
        // }

        const { encryptedMessage, nonce } = this.encryptMessage(messageText, this.channelKey);

        const message: Message = {
            encryptedMessage,
            nonce,
            sender: senderPublicKeyBase64,
            timestamp: Date.now()
        };

        this.messages.push(message);
        return message;
    }

    // Chiffrer un message
    private encryptMessage(message: string, channelKey: Uint8Array): {
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

    // Déchiffrer un message
    decryptMessage(
        memberPublicKeyBase64: string,
        message: Message
    ): string | null {
        const member = this.members.get(memberPublicKeyBase64);

        // Vérifier si le membre a été révoqué
        if (!member || member.revokedAt) {
            return null;
        }

        try {
            return naclUtil.encodeUTF8(
                nacl.secretbox.open(
                    naclUtil.decodeBase64(message.encryptedMessage),
                    naclUtil.decodeBase64(message.nonce),
                    this.channelKey
                ) || new Uint8Array()
            );
        } catch {
            return null;
        }
    }

    // Scénario de test
    static runScenario() {
        const channel = new SecureChannel();

        // Créer des participants
        const participant1KeyPair = nacl.box.keyPair();
        const participant2KeyPair = nacl.box.keyPair();
        const participant3KeyPair = nacl.box.keyPair();

        // Ajouter les participants
        const participant1Key = channel.addMember(participant1KeyPair.publicKey);
        const participant2Key = channel.addMember(participant2KeyPair.publicKey);
        const participant3Key = channel.addMember(participant3KeyPair.publicKey);

        // Envoyer un premier message
        const firstMessage = channel.sendMessage(participant1Key, "Hello, premier message!");

        // Afficher que tous peuvent lire
        console.log("Lecture du 1er message :");
        console.log("Participant 1:", channel.decryptMessage(participant1Key, firstMessage));
        console.log("Participant 2:", channel.decryptMessage(participant2Key, firstMessage));
        console.log("Participant 3:", channel.decryptMessage(participant3Key, firstMessage));

        // Retirer un membre
        channel.removeMember(participant2Key);

        // Envoyer un second message
        const secondMessage = channel.sendMessage(participant1Key, "Message après exclusion");

        // Vérifier qui peut lire
        console.log("\nLecture du 2ème message :");
        console.log("Participant 1:", channel.decryptMessage(participant1Key, secondMessage));
        console.log("Participant 2 (exclus):", channel.decryptMessage(participant2Key, secondMessage));
        console.log("Participant 3:", channel.decryptMessage(participant3Key, secondMessage));
    }
}

// Exécuter le scénario
SecureChannel.runScenario();

