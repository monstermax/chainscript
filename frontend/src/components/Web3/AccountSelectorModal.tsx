// AccountSelectorModal.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";

import { HexNumber } from "@backend/types/types";
import { AccountAddress } from "@backend/types/account.types";


interface AccountSelectorModalProps {
    show: boolean;
    onClose: () => void;
    onSelect: (account: string) => void;
}


const AccountSelectorModal: React.FC<AccountSelectorModalProps> = ({ show, onClose, onSelect }) => {
    const [accounts, setAccounts] = useState<string[]>([]);

    // Charger la liste des comptes existants
    useEffect(() => {
        if (!show) return;

        const fetchAccounts = async () => {
            try {
                const response = await axios.get<Map<AccountAddress, HexNumber>>("/api/accounts");
                const accounts = Object.entries(response.data).map(([accountAddress, blockHeight]) => ({accountAddress, blockHeight}))
                setAccounts(accounts.map(account => account.accountAddress));

            } catch (error) {
                console.error("Erreur lors de la récupération des comptes:", error);
            }
        };

        fetchAccounts();
    }, [show]);

    if (!show) return null; // Ne pas afficher la modal si elle est fermée

    return (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Sélectionner un compte</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <ul className="list-group">
                            {accounts.length > 0 ? (
                                accounts.map((account) => (
                                    <li key={account}
                                        className="list-group-item list-group-item-action"
                                        role="button"
                                        onClick={() => {
                                            onSelect(account);
                                            onClose();
                                        }}>
                                        {account}
                                    </li>
                                ))
                            ) : (
                                <li className="list-group-item">Aucun compte trouvé</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default AccountSelectorModal;

