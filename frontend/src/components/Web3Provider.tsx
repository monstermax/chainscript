// Web3Provider.tsx

import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

import { AccountAddress } from "@backend/types/account.types";


interface Web3ContextType {
    walletAddress: AccountAddress | null;
    connectWallet: (requestPermission?: boolean) => void;
    copyAddressToClipboard: () => void,
}


const Web3Context = createContext<Web3ContextType | undefined>(undefined);


export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [walletAddress, setWalletAddress] = useState<AccountAddress | null>(null);


    const connectWallet = async (requestPermission=false) => {
        if (!window.ethereum) {
            alert("MetaMask non détecté !");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = (await provider.send(requestPermission ? "eth_requestAccounts" : "eth_accounts", [])) as AccountAddress[];
            console.log('accounts:', accounts)

            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
            }

        } catch (error) {
            console.error("Erreur connexion wallet :", error);
        }
    };


    const copyAddressToClipboard = () => {
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

            window.ethereum.on("accountsChanged", (_accounts) => {
                const accounts = _accounts as AccountAddress[];
                setWalletAddress(accounts.length > 0 ? accounts[0] : null);
            });
        }
    }, []);

    return (
        <Web3Context.Provider value={{ walletAddress, connectWallet, copyAddressToClipboard }}>
            {children}
        </Web3Context.Provider>
    );
};


export const useWeb3 = (): Web3ContextType => {
    const context = useContext(Web3Context);

    if (!context) {
        throw new Error("useWeb3 doit être utilisé dans un Web3Provider");
    }

    return context;
};

