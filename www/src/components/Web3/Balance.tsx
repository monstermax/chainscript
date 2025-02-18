// Balance.tsx

import React, { useState } from "react";
import { ethers, formatEther, parseEther } from "ethers";

import { symbol } from "@frontend/config.client";

import AccountSelectorModal from "./AccountSelectorModal";

import type { AccountAddress } from "@backend/types/account.types";


const Balance: React.FC<{ walletConnected: boolean }> = ({ walletConnected }) => {
    const [balance, setBalance] = useState<string | null>(null);
    const [recipient, setRecipient] = useState<AccountAddress>("0x0000000000000000000000000000000000000030");
    const [amount, setAmount] = useState<string>("10");
    const [showModal, setShowModal] = useState(false);

    const getBalance = async () => {
        if (!window.ethereum) return alert("Wallet non connecté");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const balance = await provider.getBalance(await signer.getAddress());
        setBalance(formatEther(balance));
    };

    const transfer = async () => {
        if (!window.ethereum) return alert("Wallet non connecté");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        await signer.sendTransaction({
            to: recipient,
            value: parseEther(amount),
        });
    };

    return (
        <div className="card p-4">
            <h3>💰 Balance</h3>
            <p>Solde actuel : {balance ? `${balance} ${symbol}` : "N/A"}</p>
            <button className="btn btn-primary" disabled={!walletConnected} onClick={getBalance}>Récupérer le solde</button>

            <h4 className="mt-4">Envoyer des fonds</h4>

            <form>
                <div className="mb-2">
                    <label className="form-label">Adresse du destinataire</label>

                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value as AccountAddress)}
                        />

                        <button className="btn btn-outline-secondary" type="button" onClick={() => setShowModal(true)}>
                            ...
                        </button>
                    </div>
                </div>

                <div className="mb-2">
                    <label className="form-label">Montant</label>
                    <input type="text" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <button className="btn btn-success mt-2" disabled={!walletConnected} onClick={transfer}>Envoyer</button>
            </form>


            {/* Modal pour sélectionner un compte */}
            <AccountSelectorModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSelect={(account) => setRecipient(account as AccountAddress)}
            />
        </div>
    );
};


export default Balance;
