
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

// Services et utilitaires
import * as cryptoService from "@frontend/services/CryptoService";
import { executeSmartContract, callSmartContract } from "@frontend/utils/contractUtils";

// Configuration et types
import { contractsAddresses } from "@frontend/config.client";
import { TeleScriptAbi } from "@frontend/abi/TeleScriptAbi";

// Composants
import { useWeb3 } from "@frontend/components/Web3Provider";

import type { AccountAddress } from "@backend/types/account.types";


interface Message {
    sender: string;
    encryptedMessage: string;
    nonce: string;
}


const TeleScriptAddress = contractsAddresses.dApps.TeleScript as AccountAddress;


const TeleScript: React.FC = () => {
    // États
    const { walletAddress } = useWeb3();
    const [chats, setChats] = useState<string[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMemberAddress, setNewMemberAddress] = useState<string>("");
    const [chatMembers, setChatMembers] = useState<string>("");
    const [messageInput, setMessageInput] = useState<string>("");
    const [loading, setLoading] = useState(false);

    // Gestion des clés
    const [keyPair, setKeyPair] = useState<nacl.BoxKeyPair | null>(null);
    const [publicKey, setPublicKey] = useState<string>("");


    // Initialisation des clés et connexion
    useEffect(() => {
        initializeKeyPair();
    }, []);


    useEffect(() => {
        fetchUserChats();

        if (walletAddress) {
            setChatMembers(walletAddress);
        }

    }, [walletAddress]);


    // Initialisation de la paire de clés
    const initializeKeyPair = () => {
        const storedKeyPair = cryptoService.getStoredKeyPair();

        if (storedKeyPair.keyPair) {
            setKeyPair(storedKeyPair.keyPair);
            setPublicKey(naclUtil.encodeBase64(storedKeyPair.keyPair.publicKey));

        } else {
            const newKeyPair = cryptoService.generateKeyPair();
            setKeyPair(newKeyPair);
            setPublicKey(naclUtil.encodeBase64(newKeyPair.publicKey));
        }
    };


    const registerUser = async () => {
        if (!walletAddress || !window.ethereum || !keyPair) return;

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, TeleScriptAddress, TeleScriptAbi, "registerUser", []);
            alert("✅ Utilisateur enregistré !");

        } catch (error) {
            console.error("Erreur lors de l'enregistrement :", error);

        } finally {
            setLoading(false);
        }
    };



    const fetchUserChats = async () => {
        if (!walletAddress || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);

            const chatsJson = await callSmartContract(
                provider,
                TeleScriptAddress,
                TeleScriptAbi,
                "getUserChats",
                [walletAddress]
            );

            const chats = JSON.parse(chatsJson);
            setChats(chats);

            // Récupérer les clés de canal pour chaque chat
            for (const chatId of chats) {
                await fetchChannelKey(chatId);
            }

            return chats;

        } catch (error) {
            console.error("Erreur lors de la récupération des chats :", error);
        }
    };


    const fetchChannelKey = async (chatId: string) => {
        if (!walletAddress || !window.ethereum || !keyPair) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);

            const encryptedKey = await callSmartContract(
                provider,
                TeleScriptAddress,
                TeleScriptAbi,
                "getSessionKey",
                [chatId, walletAddress]
            );

            if (!encryptedKey) {
                console.warn(`Pas de clé trouvée pour le chat ${chatId}`);
                return;
            }

            try {
                // La clé est directement en base64
                const sessionKey = naclUtil.decodeBase64(encryptedKey);

                // On prend les 32 premiers bytes si la clé est plus longue
                const key32bytes = sessionKey.slice(0, 32);

                cryptoService.saveChannelKey(chatId, key32bytes);
                console.log(`✅ Clé récupérée pour le chat ${chatId}`);

            } catch (error) {
                console.error(`Erreur décodage clé pour ${chatId}:`, error);
            }

        } catch (error) {
            console.error(`Erreur lors de la récupération de la clé pour ${chatId}:`, error);
        }
    };


    // Création de chat
    const createChat = async () => {
        if (!walletAddress || !keyPair || !window.ethereum) return;

        const chatName = ""; // TODO

        try {
            // Générer une clé de canal
            const channelKey = cryptoService.generateChannelKey();

            // Récupérer les adresses des membres
            const memberAddresses = chatMembers.split(",")
                .map(m => m.trim().toLowerCase());

            // Ajouter l'adresse de l'utilisateur courant
            const allMemberAddresses = [
                walletAddress.toLowerCase(), 
                //...memberAddresses,
            ];


            // Préparer les clés publiques des membres
            const memberPublicKeys = [
                publicKey,
                // Ajouter d'autres clés publiques si nécessaire
            ];


            // Chiffrer la clé de canal
            const encryptedKeys = cryptoService.encryptChannelKeyForMembers(
                channelKey,
                allMemberAddresses,
                memberPublicKeys,
                keyPair
            );

            console.log('encryptedKeys:', encryptedKeys);

            const provider = new ethers.BrowserProvider(window.ethereum);

            // Créer le chat sur le contrat
            await executeSmartContract(
                provider,
                TeleScriptAddress,
                TeleScriptAbi,
                "createChat",
                [encryptedKeys, "true", chatName]
            );


            // Actualiser la liste des chats
            await fetchUserChats()
                .then((chats) => {
                    if (chats.length === 0) return;
                    const chatId = chats.at(-1) as string;

                    // Stocker la clé de canal localement
                    cryptoService.saveChannelKey(chatId, channelKey);
                })

        } catch (error) {
            console.error("Erreur de création de chat:", error);
        }
    };

    const sendMessage = async () => {
        if (!walletAddress || !window.ethereum || !selectedChat) return;

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            // Récupérer la clé de canal
            const channelKey = cryptoService.getChannelKey(selectedChat);

            if (!channelKey) {
                throw new Error("Clé de canal non trouvée");
            }

            // Chiffrer le message
            const { encryptedMessage, nonce } = cryptoService.encryptMessage(
                messageInput,
                channelKey
            );

            // Envoyer le message
            await executeSmartContract(
                provider,
                TeleScriptAddress,
                TeleScriptAbi,
                "sendMessage",
                [selectedChat, encryptedMessage, nonce]
            );

            setMessageInput("");
            await fetchMessages(selectedChat);

        } catch (error) {
            console.error("Erreur lors de l'envoi du message :", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (chatId: string) => {
        if (!walletAddress || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);

            const messagesJson = await callSmartContract(
                provider,
                TeleScriptAddress,
                TeleScriptAbi,
                "getMessages",
                [chatId, walletAddress, "100", "0"]
            );

            const messages = JSON.parse(messagesJson);
            setMessages(messages);
            setSelectedChat(chatId);

        } catch (error) {
            console.error("Erreur lors de la récupération des messages :", error);
        }
    };

    const decryptMessageContent = (message: Message): string => {
        try {
            if (!selectedChat) return "Chat non sélectionné";

            // Récupérer la clé de canal
            const channelKey = cryptoService.getChannelKey(selectedChat);

            if (!channelKey) {
                throw new Error("Clé de canal non trouvée");
            }

            return cryptoService.decryptMessage(
                message.encryptedMessage,
                message.nonce,
                channelKey
            );

        } catch (error) {
            console.error("Erreur de déchiffrement:", error);
            return "🔒 Message chiffré";
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-3">💬 TeleScript</h2>

            {/* Enregistrer l'utilisateur */}
            <div className="alert alert-light">
                <button
                    className="btn btn-primary w-100 mb-2"
                    onClick={registerUser}
                    disabled={loading || !keyPair}
                >
                    {loading ? "⏳ Enregistrement..." : "🆕 S'enregistrer"}
                </button>
            </div>

            {/* Créer un chat */}
            <div className="alert alert-light">
                <input
                    className="form-control mb-2"
                    placeholder="Membres (séparés par des virgules)"
                    value={chatMembers}
                    onChange={(e) => setChatMembers(e.target.value)}
                />

                <button
                    className="btn btn-success w-100 mb-3"
                    onClick={createChat}
                    disabled={loading || !keyPair}
                >
                    {loading ? "⏳ Création..." : "🏡 Créer un chat"}
                </button>
            </div>

            {/* Liste des chats */}
            <div className="alert alert-light">
                <h5>📜 Vos Chats</h5>

                {chats.map(chatId => (
                    <button
                        key={chatId}
                        className="btn btn-outline-primary w-100 mb-2"
                        onClick={() => fetchMessages(chatId)}
                    >
                        {chatId}
                    </button>
                ))}
            </div>

            {/* Messages */}
            {selectedChat && (
                <div className="alert alert-light">
                    <h5>💬 Messages</h5>

                    {messages.map((msg, index) => (
                        <p key={index}>
                            <strong>{msg.sender}: </strong>
                            {decryptMessageContent(msg)}
                        </p>
                    ))}

                    <input
                        className="form-control mb-2"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Votre message"
                    />

                    <button
                        className="btn btn-warning w-100"
                        onClick={sendMessage}
                        disabled={loading || !selectedChat}
                    >
                        {loading ? "⏳ Envoi..." : "📩 Envoyer"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TeleScript;
