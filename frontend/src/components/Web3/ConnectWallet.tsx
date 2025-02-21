// ConnectWallet.tsx

import { ethers } from "ethers";
import React, { useEffect, useState } from "react";

import { AccountAddress } from "@backend/types/account.types";


const ConnectWallet: React.FC<{ onConnect: (address: AccountAddress) => void }> = ({ onConnect }) => {
    const [walletAddress, setWalletAddress] = useState<AccountAddress | null>(null);

    const connectWallet = async () => {
        if (! window.ethereum) {
            alert("MetaMask non détecté !");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []) as AccountAddress[];

            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
                onConnect(accounts[0]); // Informe le parent du statut connecté
            }

        } catch (error) {
            console.error("Erreur connexion wallet :", error);
        }
    };

    const copyToClipboard = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress).then(() => {
                //alert("Adresse du wallet copiée dans le presse-papier !");

            }).catch(err => {
                console.error("Erreur lors de la copie de l'adresse :", err);
            });
        }
    };

    useEffect(() => {
        if (window.ethereum) {
            connectWallet();

            window.ethereum.on("accountsChanged", (accounts) => {
                const accountList = accounts as AccountAddress[];
                setWalletAddress(accountList.length > 0 ? accountList[0] : null);
                onConnect(accountList.length > 0 ? accountList[0] : "0x");
            });
        }
    }, []);


    return (
        <div className="d-flex align-items-center mb-3">
            {walletAddress ? (
                <div className="d-flex align-items-center">
                    <span className="badge bg-success p-2 me-2">✅ Connecté: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>

                    <button className="btn btn-outline-secondary btn-sm" onClick={copyToClipboard} title="Copier l'adresse">
                        📋
                    </button>
                </div>
            ) : (
                <button className="btn btn-primary" onClick={connectWallet}>
                    🔌 Connecter le wallet
                </button>
            )}
        </div>
    );
};

//export default ConnectWallet;
