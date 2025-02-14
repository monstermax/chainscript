// ConnectWallet.tsx

import { AccountAddress } from "@backend/types/account.types";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";


const ConnectWallet: React.FC<{ onConnect: (address: string) => void }> = ({ onConnect }) => {
    const [walletAddress, setWalletAddress] = useState<AccountAddress | null>(null);

    const connectWallet = async () => {
        if (! window.ethereum) {
            alert("MetaMask non détecté !");
            return;
        }


        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []) as AccountAddress;

            if (accounts.length > 0) {
                setWalletAddress(accounts[0] as AccountAddress);
                onConnect(accounts[0]); // Informe le parent du statut connecté
            }

        } catch (error) {
            console.error("Erreur connexion wallet :", error);
        }
    };

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts) => {
                const accountList = accounts as AccountAddress[];
                setWalletAddress(accountList.length > 0 ? accountList[0] : null);
                onConnect(accountList.length > 0 ? accountList[0] : "");
            });
        }
    }, []);


    return (
        <div className="d-flex align-items-center mb-3">
            {walletAddress ? (
                <span className="badge bg-success p-2">✅ Connecté: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            ) : (
                <button className="btn btn-primary" onClick={connectWallet}>
                    🔌 Connecter le wallet
                </button>
            )}
        </div>
    );
};

export default ConnectWallet;
