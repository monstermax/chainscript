// ChainChat.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractsAddresses } from "@frontend/config.client";
import { ChainChatAbi } from "@frontend/abi/ChainChatAbi";
import { callSmartContract, executeSmartContract } from "@frontend/utils/contractUtils";

import { useWeb3 } from "@frontend/components/Web3Provider";

import type { AccountAddress } from "@backend/types/account.types";


const ChainChatAddress = contractsAddresses.dApps.ChainChat as AccountAddress;



const ChainChat: React.FC = () => {
    const { walletAddress } = useWeb3();
    const [messages, setMessages] = useState<{ from: string; message: string; timestamp: number }[]>([]);
    const [recipient, setRecipient] = useState<AccountAddress | null>(null);
    const [messageContent, setMessageContent] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMessages();
    }, [walletAddress]);


    const fetchMessages = async () => {
        if (!walletAddress) return; // alert("Connecte ton wallet !");
        if (!window.ethereum) return; // alert("Wallet non connecté");

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);

            const result = await callSmartContract(provider, ChainChatAddress, ChainChatAbi, "getLastMessages", [walletAddress, "100", "0"]);
            console.log('result:', result);

            setMessages(JSON.parse(result));

        } catch (error) {
            console.error("Erreur lors du chargement des messages :", error);
        }
    };

    const sendMessage = async () => {
        if (!walletAddress) return; // alert("Connecte ton wallet !");
        if (!window.ethereum) return; // alert("Wallet non connecté");
        if (!recipient) return alert("Adresse du destinataire requise !");
        if (!messageContent.trim()) return alert("Le message est vide !");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, ChainChatAddress, ChainChatAbi, "sendMessage", [recipient, messageContent]);
            setMessageContent("");
            fetchMessages();

        } catch (error) {
            console.error("Erreur lors de l'envoi du message :", error);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-3">💬 ChainChat</h2>

            <div className="card p-3 mb-3">
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Adresse du destinataire (0x...)"
                    value={recipient ?? ''}
                    onChange={(e) => setRecipient(e.target.value as AccountAddress)}
                />
                <textarea
                    className="form-control mb-2"
                    placeholder="Écris ton message..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                ></textarea>
                <button className="btn btn-primary w-100" onClick={sendMessage} disabled={loading || !walletAddress || !recipient}>
                    {loading ? "⏳ Envoi..." : "📩 Envoyer"}
                </button>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-3">
                <h4 className="mb-0">📥 Messages reçus</h4>

                <button className="btn btn-outline-secondary btn-sm" onClick={fetchMessages} disabled={!walletAddress} title="Rafraîchir">
                    🔄
                </button>
            </div>

            <ul className="list-group">
                {messages.map((msg, index) => (
                    <li key={index} className="list-group-item">
                        <strong>{msg.from}</strong>: {msg.message}
                        <span className="text-muted d-block">{new Date(Number(msg.timestamp)).toLocaleString()}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};


export default ChainChat;
