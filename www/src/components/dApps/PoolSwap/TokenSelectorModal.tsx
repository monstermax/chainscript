// TokenSelectorModal.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { swapableTokens, AMMRouterAddress } from "../../../config.client";
import { TokenAbi } from "../../../abi/TokenAbi";
import { callSmartContract } from "../../../utils/contractUtils";
import { AccountAddress } from "@backend/types/account.types";

interface TokenSelectorModalProps {
    show: boolean;
    onClose: () => void;
    onSelect: (token: string) => void;
    walletAddress: string | null;
}


const TokenSelectorModal: React.FC<TokenSelectorModalProps> = ({ show, onClose, onSelect, walletAddress }) => {
    const [search, setSearch] = useState<string>("");
    const [balances, setBalances] = useState<{ [token: string]: bigint }>({});
    const [loading, setLoading] = useState<boolean>(true);

    // Charger les soldes des tokens pour l'utilisateur connecté
    useEffect(() => {
        if (!show || !walletAddress || !window.ethereum) return;

        const fetchBalances = async () => {
            if (!window.ethereum) return alert("Wallet non connecté");

            setLoading(true);

            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const newBalances: { [token: string]: bigint } = {};

                for (const [tokenAddress] of Object.entries(swapableTokens)) {
                    const balance = await callSmartContract(provider, tokenAddress as AccountAddress, TokenAbi, "balanceOf", [walletAddress]);
                    console.log(`balance for token ${tokenAddress} : ${balance}`)
                    newBalances[tokenAddress] = BigInt(balance);
                }

                setBalances(newBalances);

            } catch (error) {
                console.error("Erreur lors de la récupération des soldes :", error);
            }

            setLoading(false);
        };

        fetchBalances();
    }, [show, walletAddress]);

    if (!show) return null; // Ne pas afficher la modal si elle est fermée


    return (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Sélectionner un token</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        {/* Barre de recherche */}
                        <input
                            type="text"
                            className="form-control mb-3"
                            placeholder="Rechercher un token..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value.toLowerCase())}
                        />

                        {/* Liste des tokens */}
                        {loading ? (
                            <p>Chargement...</p>
                        ) : (
                            <ul className="list-group">
                                {Object.entries(swapableTokens)
                                    .filter(([address, symbol]) => 
                                        symbol.toLowerCase().includes(search) || address.toLowerCase().includes(search)
                                    )
                                    .map(([address, symbol]) => (
                                        <li
                                            key={address}
                                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                            role="button"
                                            onClick={() => {
                                                onSelect(address);
                                                onClose();
                                            }}
                                        >
                                            <span>
                                                <strong>{symbol}</strong> <small>({address})</small>
                                            </span>
                                            <span className="badge bg-secondary">
                                                {balances[address] ? ethers.formatUnits(balances[address], 18) : "0.00"}
                                            </span>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default TokenSelectorModal;
