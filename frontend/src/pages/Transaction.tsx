// Transaction.tsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { decimals } from "../config.client";
import { jsonReplacer, jsonReviver } from "../utils/jsonUtils";
import { divideBigInt } from "../utils/numberUtils";

import type { TransactionData, TransactionReceiptData } from "@backend/types/transaction.types";
import { formatEther } from "ethers";



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

            <p>
                <strong>Hash :</strong> {transaction.hash}
            </p>
            <p>
                <strong>De :</strong> {transaction.from}
            </p>
            <p>
                <strong>Nonce :</strong> {transaction.nonce?.toString()}
            </p>
            <p>
                <strong>Valeur :</strong> {divideBigInt(transaction.value, 10n ** BigInt(decimals))}
            </p>
            <p>
                <strong>Instructions :</strong>

                <ul>
                    {transaction.instructions.map((instruction, index) => {
                        return (
                            <li key={index}>
                                <div className="d-flex my-2">
                                    <span className="mx-3">Type: {instruction.type}</span>
                                    <span className="mx-3">Value: {formatEther(instruction.amount ?? 0n)}</span>

                                    {instruction.type === 'mint' && <span className="mx-3">Address: <a href={`#/accounts/${instruction.address}`}>{instruction.address}</a></span>}

                                    {instruction.type === 'create' && <span className="mx-3">Address: <a href={`#/accounts/${instruction.contractAddress}`}>{instruction.contractAddress}</a></span>}
                                    {instruction.type === 'create' && <span className="mx-3">Class: {instruction.contractClass}</span>}

                                    {instruction.type === 'execute' && <span className="mx-3">Address: <a href={`#/accounts/${instruction.contractAddress}`}>{instruction.contractAddress}</a></span>}
                                    {instruction.type === 'execute' && <span className="mx-3">Class: {instruction.className}</span>}
                                    {instruction.type === 'execute' && <span className="mx-3">Method: {instruction.methodName}</span>}
                                    {instruction.type === 'execute' && <span className="mx-3">Arguments: {JSON.stringify(instruction.methodArgs)}</span>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </p>
            <p>
                <strong>Result :</strong> {(receipt?.success ?? false) ? 'success' : 'failed'}
            </p>
        </div>
    );
};


export default Transaction;
