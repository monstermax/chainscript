// TeleScriptInterface.tsx

import React, { useState } from "react";
import { ethers } from "ethers";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

import { TeleScriptAddress } from "../../../config.client";
import { TeleScriptAbi } from "../../../abi/TeleScriptAbi";

import { convertCustomAbiToEthersFormat } from "../../../utils/abiUtils";
import { callSmartContract } from "../../../utils/contractUtils";



const TeleScript: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [chatId, setChatId] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [transactionHash, setTransactionHash] = useState<string | null>(null);
    const [sessionKey, setSessionKey] = useState<Uint8Array | null>(null);

    // 🔗 Connexion Wallet + Initialisation du smart contract
    const connectWallet = async () => {
        if (!window.ethereum) return alert("Wallet non connecté");

        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const signer = await browserProvider.getSigner();

        const ethersAbi = convertCustomAbiToEthersFormat(TeleScriptAbi)
        const teleScriptContract = new ethers.Contract(TeleScriptAddress, ethersAbi, signer);

        setWalletAddress(await signer.getAddress());
        setProvider(browserProvider);
        setContract(teleScriptContract);
    };

    // 👤 Enregistrer un utilisateur
    const registerUser = async () => {
        if (!contract) return alert("Veuillez connecter votre wallet.");
        const tx = await contract.registerUser();
        setTransactionHash(tx.hash);
        await tx.wait();
        alert("Utilisateur enregistré !");
    };

    // 🔑 Générer une clé de session pour le chat
    const generateSessionKey = () => {
        const sessionKey = nacl.randomBytes(32);
        setSessionKey(sessionKey);
        return sessionKey;
    };

    // 🔒 Chiffrement de la sessionKey pour un membre donné
    function encryptSessionKey(sessionKey: Uint8Array, recipientPublicKey: Uint8Array, myPrivateKey: Uint8Array) {
        const nonce = nacl.randomBytes(24);
        const encryptedKey = nacl.box(sessionKey, nonce, recipientPublicKey, myPrivateKey);
        return { encryptedKey: naclUtil.encodeBase64(encryptedKey), nonce: naclUtil.encodeBase64(nonce) };
    }

    // 💬 Créer un chat avec chiffrement des clés
    const createChat = async () => {
        if (!contract) return alert("Veuillez connecter votre wallet.");
        const isPublic = prompt("Ce chat est-il public ? (true/false)", "");
        const members = prompt("Adresses des membres (séparées par ,)", "");

        const myPrivateKey: Uint8Array | string = ''; // TODO

        if (!members) return alert("Aucun membre spécifié");

        // Générer une clé de session unique
        const sessionKey = generateSessionKey();

        const encryptedSessionKeys: { [key: string]: { encryptedKey: string; nonce: string } } = {};
        for (const member of members.split(",")) {
            const memberAddress = member.trim();
            if (!memberAddress) continue;

            const memberPublicKey = await contract.getUserPublicKey(memberAddress); // 🔄 Récupère la clé publique
            //const memberPublicKey = await callSmartContract(provider, TeleScriptAddress, TeleScriptAbi, "getUserPublicKey", []);

            const { encryptedKey, nonce } = encryptSessionKey(sessionKey, naclUtil.decodeBase64(memberPublicKey), naclUtil.decodeBase64(myPrivateKey));
            encryptedSessionKeys[memberAddress] = { encryptedKey, nonce };
        }

        // Transformer l'objet en string pour la blockchain
        const encryptedSessionKeysList = Object.entries(encryptedSessionKeys)
            .map(([address, { encryptedKey, nonce }]) => `${address}:${encryptedKey}:${nonce}`)
            .join(",");

        const tx = await contract.createChat(encryptedSessionKeysList, isPublic);
        setTransactionHash(tx.hash);

        const receipt = await tx.wait();
        setChatId(receipt.logs[0].data);

        alert(`Chat créé avec ID: ${receipt.logs[0].data}`);
    };

    // ✉️ Chiffrement d'un message
    function encryptMessage(message: string, sessionKey: Uint8Array) {
        const nonce = nacl.randomBytes(24);
        const encryptedMessage = nacl.secretbox(naclUtil.decodeUTF8(message), nonce, sessionKey);
        return { encryptedMessage: naclUtil.encodeBase64(encryptedMessage), nonce: naclUtil.encodeBase64(nonce) };
    }

    // ✉️ Envoyer un message chiffré
    const sendMessage = async () => {
        if (!contract || !chatId || !message || !sessionKey) return alert("Remplissez tous les champs.");

        const { encryptedMessage, nonce } = encryptMessage(message, sessionKey);
        const tx = await contract.sendMessage(chatId, encryptedMessage, nonce);
        setTransactionHash(tx.hash);
        await tx.wait();
        alert("Message envoyé !");
    };

    return (
        <div className="container mt-4">
            <h2>🔗 TeleScript Interface (Smart Contract)</h2>

            <button className="btn btn-primary mb-3" onClick={connectWallet}>
                {walletAddress ? `Connecté: ${walletAddress}` : "Connecter le Wallet"}
            </button>

            {transactionHash && <p className="alert alert-info">Dernière transaction : {transactionHash}</p>}

            <div className="card p-3 mb-3">
                <h3>👤 Gestion des utilisateurs</h3>
                <button className="btn btn-success" onClick={registerUser}>Enregistrer un utilisateur</button>
            </div>

            <div className="card p-3 mb-3">
                <h3>💬 Gestion des chats</h3>
                <button className="btn btn-warning" onClick={createChat}>Créer un Chat</button>
                <input className="form-control mt-2" placeholder="Chat ID" value={chatId} onChange={(e) => setChatId(e.target.value)} />
            </div>

            <div className="card p-3 mb-3">
                <h3>✉️ Envoyer un message</h3>
                <input className="form-control mb-2" placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
                <button className="btn btn-primary" onClick={sendMessage}>Envoyer</button>
            </div>
        </div>
    );
};


export default TeleScript;
