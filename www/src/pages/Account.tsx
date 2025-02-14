// Account.tsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { jsonReviver } from "../utils/jsonUtils";
import { divideBigInt } from "../utils/numberUtils";
import { decimals } from "../config.client";

import type { AccountData } from "@backend/types/account.types";


const Account: React.FC = () => {
    const { accountAddress } = useParams<{ accountAddress: string }>();
    const [account, setAccount] = useState<AccountData | null>(null);
    const [showAbi, setShowAbi] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [showMemory, setShowMemory] = useState(false);


    useEffect(() => {
        const fetchAccount = async () => {
            try {
                const response = await fetch(`/api/accounts/${accountAddress}`);
                const json = await response.text();
                const account = JSON.parse(json, jsonReviver) as AccountData;
                setAccount(account);

            } catch (error) {
                console.error("Erreur lors de la récupération du compte :", error);
            }
        };

        fetchAccount();
    }, [accountAddress]);

    if (!account) return <p className="text-center mt-4">Chargement du compte...</p>;


    return (
        <div className="container mt-4">
            <h2 className="mb-4">Compte : <span className="text-primary">{account.address}</span></h2>

            {/* Informations principales */}
            <div className="card mb-4">
                <div className="card-body">
                    <p><strong>💰 Solde :</strong> {divideBigInt(account.balance, BigInt(10 ** decimals))} ETH</p>
                    <p><strong>🔄 Transactions :</strong> {account.transactionsCount}</p>
                    <p><strong>🔗 Hash :</strong> {account.hash}</p>
                </div>
            </div>

            {/* Code du contrat */}
            {account.code && (
                <div className="card mb-4">
                    <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                        📌 Code du contrat
                        <button className="btn btn-sm btn-light" onClick={() => setShowCode(!showCode)}>
                            {showCode ? "−" : "+"}
                        </button>
                    </div>

                    {showCode && (
                        <div className="card-body">
                            <pre className="bg-light p-3 rounded" style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>
                                <code>{account.code}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* ABI du contrat */}
            {account.abi && (
                <div className="card mb-4">
                    <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                        📜 ABI
                        <button className="btn btn-sm btn-light" onClick={() => setShowAbi(!showAbi)}>
                            {showAbi ? "−" : "+"}
                        </button>
                    </div>

                    {showAbi && (
                        <div className="card-body">
                            <pre className="bg-light p-3 rounded" style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>
                                <code>{JSON.stringify(account.abi, null, 4)}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Memory du contrat */}
            {account.abi && (
                <div className="card mb-4">
                    <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                    💾 Memory
                        <button className="btn btn-sm btn-light" onClick={() => setShowMemory(!showMemory)}>
                            {showMemory ? "−" : "+"}
                        </button>
                    </div>

                    {showMemory && (
                        <div className="card-body">
                            <pre className="bg-light p-3 rounded" style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>
                                <code>{JSON.stringify(account.memory, null, 4)}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


export default Account;
