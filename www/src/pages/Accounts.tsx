// Accounts.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";

import type { HexNumber } from "@backend/types/types";

import type { AccountAddress } from "@backend/types/account.types";


const Accounts: React.FC = () => {
    const [accounts, setAccounts] = useState<{ accountAddress: string; blockHeight: number }[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const response = await axios.get<Map<AccountAddress, HexNumber>>("/api/accounts");
                const accounts = Object.entries(response.data).map(([accountAddress, blockHeight]) => ({accountAddress, blockHeight}))
                setAccounts(accounts);

            } catch (error) {
                console.error("Erreur lors de la récupération des comptes :", error);
            }
        };

        fetchAccounts();
    }, []);

    return (
        <div className="container mt-4">
            <h2>Liste des Comptes</h2>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Adresse</th>
                    </tr>
                </thead>
                <tbody>
                    {accounts.map((account, index) => (
                        <tr key={account.accountAddress}>
                            <td>
                                {index} <a href={`#/accounts/${account.accountAddress}`}>{account.accountAddress}</a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default Accounts;
