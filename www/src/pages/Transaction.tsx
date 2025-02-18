// Transaction.tsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { decimals } from "../config.client";
import { jsonReviver } from "../utils/jsonUtils";
import { divideBigInt } from "../utils/numberUtils";

import type { TransactionData, TransactionReceiptData } from "@backend/types/transaction.types";



const Transaction: React.FC = () => {
    const { txHash } = useParams<{ txHash: string }>();
    const [transaction, setTransaction] = useState<TransactionData | null>(null);
    const [receipt, setReceipt] = useState<TransactionReceiptData | null>(null);

    useEffect(() => {
        const fetchTransaction = async () => {
            try {
                const response = await fetch(`/api/transactions/${txHash}`);
                const json = await response.text();

                const { tx, receipt } = JSON.parse(json, jsonReviver) as { tx: TransactionData, receipt: TransactionReceiptData };
                setTransaction(tx);
                setReceipt(receipt);

            } catch (error) {
                console.error("Erreur lors de la récupération de la transaction :", error);
            }
        };

        fetchTransaction();
    }, [txHash]);

    if (!transaction) return <p>Chargement de la transaction...</p>;

    return (
        <div className="container mt-4">
            <h2>Transaction</h2>
            <p><strong>Hash :</strong> {transaction.hash}</p>
            <p><strong>De :</strong> {transaction.from}</p>
            <p><strong>Nonce :</strong> {transaction.nonce}</p>
            <p><strong>Valeur :</strong> {divideBigInt(transaction.value, 10n ** BigInt(decimals))}</p>
            <p><strong>Instructions :</strong> {transaction.instructions.map(instruction => instruction.type).join(', ')}</p>
            <p><strong>Result :</strong> {(receipt?.success ?? false) ? 'success' : 'failed'}</p>
        </div>
    );
};


export default Transaction;
