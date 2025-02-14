// Transactions.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import { TransactionHash } from "@backend/types/transaction.types";


const Transactions: React.FC = () => {
    const [transactions, setTransactions] = useState<{ txHash: TransactionHash; blockHeight: number }[]>([]);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await axios.get<Map<TransactionHash, number>>("/api/transactions");
                const transactions = Object.entries(response.data).map(([txHash, blockHeight]) => ({txHash: txHash as TransactionHash, blockHeight}))
                setTransactions(transactions);

            } catch (error) {
                console.error("Erreur lors de la récupération des transactions :", error);
            }
        };

        fetchTransactions();
    }, []);

    return (
        <div className="container mt-4">
            <h2>Liste des dernières transactions</h2>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Hash</th>
                        <th>Block</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((tx) => (
                        <tr key={tx.txHash}>
                            <td>
                                <a href={`#/transactions/${tx.txHash}`}>{tx.txHash}</a>
                            </td>
                            <td>
                                <a href={`#/blocks/${tx.blockHeight}`}>{tx.blockHeight}</a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default Transactions;
