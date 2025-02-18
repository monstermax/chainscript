// Balance.tsx

import React, { useState } from "react";
import { ethers, formatEther, parseEther } from "ethers";

import { symbol } from "@frontend/config.client";

import AccountSelectorModal from "./AccountSelectorModal";

import type { AccountAddress } from "@backend/types/account.types";
import { formatAmountEtherSafe } from "@frontend/utils/numberUtils";


const Balance: React.FC<{ walletConnected: boolean }> = ({ walletConnected }) => {
    const [balance, setBalance] = useState<bigint | null>(null);
    const [recipient, setRecipient] = useState<AccountAddress>("0x0000000000000000000000000000000000000030");
    const [amountEther, setAmountEther] = useState<string>("10");
    const [showModal, setShowModal] = useState(false);

    const getBalance = async () => {
        if (!window.ethereum) return alert("Wallet non connecté");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const balance = await provider.getBalance(await signer.getAddress());
        setBalance(balance);
    };

    const transfer = async () => {
        if (!window.ethereum) return alert("Wallet non connecté");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const value = parseEther(amountEther);

        await signer.sendTransaction({
            to: recipient,
            value,
        });
    };

    const setAmountEtherSafe = (value: string) => {
        const valueSafe: string | null = formatAmountEtherSafe(value);
        if (valueSafe === null) return;
        setAmountEther(valueSafe);
    }


    return (
        <div className="card p-4">
            <h3>💰 Balance</h3>
            <p>Solde actuel : {balance ? `${formatEther(balance)} ${symbol}` : "N/A"}</p>
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

                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            value={amountEther || "0"}
                            onChange={(e) => setAmountEtherSafe(e.target.value)}
                            />

                        <span className="input-group-text">{symbol}</span>
                    </div>
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
