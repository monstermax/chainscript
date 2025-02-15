// ContractCall.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { convertCustomAbiToEthersFormat } from "./abiUtils";

import type { AccountAddress, CodeAbi } from "@backend/types/account.types";
import { callSmartContract } from "./contractUtils";


interface ContractCallProps {
    contractAddress: AccountAddress;
    contractAbi: CodeAbi | null;
    selectedMethod: string;
    setSelectedMethod: React.Dispatch<React.SetStateAction<string>>;
    callMethods: string[];
    walletConnected: boolean;
}


const ContractCall: React.FC<ContractCallProps> = ({ contractAddress, contractAbi, selectedMethod, setSelectedMethod, callMethods, walletConnected }) => {
    const [methodArgsNames, setMethodArgsNames] = useState<string[]>(["address"]);
    const [methodArgs, setMethodArgs] = useState<string[]>(["0xee5392913a7930c233Aa711263f715f616114e9B"]);
    const [callResult, setCallResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);


    // Met à jour le nombre d'inputs en fonction de la méthode sélectionnée
    useEffect(() => {
        if (!contractAbi || !selectedMethod) return;

        const methodData = contractAbi?.find((c: any) => c.methods[selectedMethod]);
        if (!methodData) return;

        const methodInputs = methodData.methods[selectedMethod].inputs ?? [];
        setMethodArgs(new Array(methodInputs.length).fill(""));
        setMethodArgsNames(methodInputs);
    }, [selectedMethod, contractAbi]);


    const callContract = async () => {
        try {
            if (!window.ethereum) return alert("Wallet non connecté");
            if (!contractAbi) return alert("Pas d'ABI trouvé");
            if (!selectedMethod) return alert("Aucune fonction sélectionné");

            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            const res = await callSmartContract(provider, contractAddress, contractAbi, selectedMethod, methodArgs);
            console.log('eth_call result:', res);

            setCallResult(res.toString());

        } catch (err: any) {
            console.error("Erreur d'exécution:", err);
            alert("Erreur: " + err.message);

        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="container mt-4">
            <h4 className="mb-3">🔍 Lecture d’un contrat</h4>

            <div className="mb-3">
                <label className="form-label">Méthode</label>

                <select className="form-select" value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
                    {callMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                    ))}
                </select>
            </div>

            <div className="mb-3">
                <label className="form-label">Arguments</label>

                {methodArgs.map((arg, index) => (
                    <input
                        key={index}
                        type="text"
                        className="form-control mb-2"
                        placeholder={methodArgsNames[index]}
                        value={arg}
                        onChange={(e) => {
                            const newArgs = [...methodArgs];
                            newArgs[index] = e.target.value;
                            setMethodArgs(newArgs);
                        }}
                    />
                ))}
            </div>

            <button className="btn btn-primary w-100" onClick={callContract} disabled={!walletConnected || loading}>
                {loading ? "⏳ Appel en cours..." : "🔍 Exécuter"}
            </button>

            {callResult !== null && <p className="alert alert-success mt-3">Résultat: {callResult}</p>}
        </div>
    );
};


export default ContractCall;
