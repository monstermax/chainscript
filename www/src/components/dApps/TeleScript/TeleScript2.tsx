// TeleScript2.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";


import { TeleScriptAbi } from "../../../abi/TeleScriptAbi";
import { TeleScriptAddress } from "../../../config.client";
import { callSmartContract, executeSmartContract } from "../../../utils/contractUtils";
import { bufferToHex, hexToUint8Array } from "../../../utils/hexaUtils";

import ConnectWallet from "../../Web3/ConnectWallet";

import type { AccountAddress } from "@backend/types/account.types";


const TeleScript2: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<AccountAddress | null>(null);
    const [chats, setChats] = useState<string[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<{ sender: string; encryptedMessage: string; nonce: string }[]>([]);
    const [messageInput, setMessageInput] = useState("");
    const [chatMembers, setChatMembers] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [keyPair, setKeyPair] = useState<nacl.BoxKeyPair | null>(null);
    const [sessionKeys, setSessionKeys] = useState<{ [chatId: string]: Uint8Array }>({});


    useEffect(() => {
        if (walletAddress) {
            fetchUserChats();
            generateKeyPair();
        }
    }, [walletAddress]);


    /** 🔑 Génère une paire de clés pour l'utilisateur */
    const generateKeyPair = () => {
        const newKeyPair = nacl.box.keyPair();
        setKeyPair(newKeyPair);
        console.log("newKeyPair:", newKeyPair);
        console.log("🔑 Clé publique:", naclUtil.encodeBase64(newKeyPair.publicKey));
    };

    /** 📥 Récupère les chats de l'utilisateur */
    const fetchUserChats = async () => {
        if (!walletAddress || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const chatsJson = await callSmartContract(provider, TeleScriptAddress, TeleScriptAbi, "getUserChats", [walletAddress]);
            const chats = JSON.parse(chatsJson);

            setChats(chats);
            console.log("📜 Chats récupérés:", chats);

        } catch (error) {
            console.error("Erreur lors de la récupération des chats :", error);
        }
    };

    /** ✉️ Récupère les messages d'un chat */
    const fetchMessages = async (chatId: string) => {
        if (!walletAddress || !window.ethereum) return;
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const messagesJson = await callSmartContract(provider, TeleScriptAddress, TeleScriptAbi, "getMessages", [chatId, walletAddress]);
            console.log('messagesJson:', messagesJson)
            const messages = JSON.parse(messagesJson);

            setMessages(messages);
            setSelectedChat(chatId);
            console.log("💬 Messages récupérés:", messages);

        } catch (error) {
            console.error("Erreur lors de la récupération des messages :", error);
        }
    };

    /** 🆕 Enregistre l'utilisateur */
    const registerUser = async () => {
        if (!walletAddress || !window.ethereum) return;
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

    /** 🏡 Crée un nouveau chat */
    const createChat = async () => {
        if (!walletAddress || !window.ethereum || !keyPair) return;
        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            const channelKey = nacl.randomBytes(32);
            const members = chatMembers.split(",").map(member => member.trim().toLowerCase());

            const encryptedKeys = members.map(member => {
                //return { [member]: naclUtil.encodeBase64(nacl.secretbox(channelKey, nacl.randomBytes(24), keyPair.secretKey)) };
                return `${member}:${naclUtil.encodeBase64(nacl.secretbox(channelKey, nacl.randomBytes(24), keyPair.secretKey))}`;
            })
            .join(',');

            //console.log('encryptedKeys:', encryptedKeys)

            const { tx, receipt } = await executeSmartContract(provider, TeleScriptAddress, TeleScriptAbi, "createChat", [encryptedKeys, "true"]);
            const chatId = 'TEST';
            alert(`✅ Chat créé avec l'ID: ${chatId}`);

            console.log('channelKey:', channelKey)
            localStorage.setItem(`pk-chat-${chatId}`, bufferToHex(channelKey))

            fetchUserChats();
            //setSessionKeys((prev) => ({ ...prev, [chatId]: channelKey }));

        } catch (error) {
            console.error("Erreur lors de la création du chat :", error);

        } finally {
            setLoading(false);
        }
    };

    /** ➕ Ajoute un membre à un chat */
    const addMember = async (chatId: string, newMember: string) => {
        if (!walletAddress || !window.ethereum) return;
        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, TeleScriptAddress, TeleScriptAbi, "addMember", [chatId, newMember]);
            alert(`✅ Membre ajouté à ${chatId}`);

        } catch (error) {
            console.error("Erreur lors de l'ajout du membre :", error);

        } finally {
            setLoading(false);
        }
    };

    /** 📩 Envoie un message chiffré */
    const sendMessage = async () => {
        if (!walletAddress || !window.ethereum || !selectedChat) {
            console.error("⛔ Conditions non remplies pour envoyer un message.");
            return;
        }

        // 🔹 Récupérer la clé de session depuis le localStorage et convertir en Uint8Array
        //const chatId = selectedChat;
        const chatId = 'TEST';
        const channelKeyHex = localStorage.getItem(`pk-chat-${chatId}`);

        if (!channelKeyHex || channelKeyHex === "0x") {
            console.error("⛔ Clé de canal introuvable !");
            return;
        }

        const channelKey = hexToUint8Array(channelKeyHex);

        if (!channelKey || channelKey.length !== 32) {
            console.error("⛔ Clé de canal invalide ou incorrecte :", channelKey);
            return;
        }

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            // 🔹 Générer un nonce
            const nonce = nacl.randomBytes(24);

            // 🔹 Chiffrer le message
            const encryptedMessage = nacl.secretbox(naclUtil.decodeUTF8(messageInput), nonce, channelKey);

            // 🔹 Appeler le smart contract pour envoyer le message
            await executeSmartContract(provider, TeleScriptAddress, TeleScriptAbi, "sendMessage", [
                selectedChat,
                naclUtil.encodeBase64(encryptedMessage),
                naclUtil.encodeBase64(nonce),
            ]);

            console.log("✅ Message chiffré et envoyé avec succès !");
            setMessageInput("");
            fetchMessages(selectedChat);

        } catch (error) {
            console.error("❌ Erreur lors de l'envoi du message :", error);

        } finally {
            setLoading(false);
        }
    };

    const decryptMessage = (encryptedMessage: string, nonce: string, channelKey: Uint8Array): string => {
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


    // TODO: decoder la channelKey avec notre clé
    const channelKeyHex = localStorage.getItem(`pk-chat-TEST`);
    const channelKey = channelKeyHex ? hexToUint8Array(channelKeyHex) : null;

    return (
        <div className="container mt-4">
            <h2 className="mb-3">💬 TeleScript</h2>
            <ConnectWallet onConnect={setWalletAddress} />

            {/* Enregistrer l'utilisateur */}
            <div className="alert alert-light">
                <button className="btn btn-primary w-100 mb-2" onClick={registerUser} disabled={loading}>
                    {loading ? "⏳ Enregistrement..." : "🆕 S'enregistrer"}
                </button>
            </div>

            {/* Créer un chat */}
            <div className="alert alert-light">
                <input
                    className="form-control mb-2"
                    placeholder="Membres (séparés par des virgules)"
                    value={chatMembers}
                    onChange={(e) => setChatMembers(e.target.value)} />

                <button className="btn btn-success w-100 mb-3" onClick={createChat} disabled={loading}>
                    {loading ? "⏳ Création..." : "🏡 Créer un chat"}
                </button>
            </div>

            {/* Liste des chats */}
            <div className="alert alert-light">
                <h5>📜 Vos Chats</h5>

                {chats.map(chatId => (
                    <button key={chatId} className="btn btn-outline-primary w-100 mb-2" onClick={() => fetchMessages(chatId)}>
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
                            {channelKey ? decryptMessage(msg.encryptedMessage, msg.nonce, channelKey) : msg.encryptedMessage}
                        </p>
                    ))}

                    <input
                        className="form-control mb-2"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Votre message" />

                    <button className="btn btn-warning w-100" onClick={sendMessage} disabled={loading}>
                        {loading ? "⏳ Envoi..." : "📩 Envoyer"}
                    </button>
                </div>
            )}
        </div>
    );
};


export default TeleScript2;
