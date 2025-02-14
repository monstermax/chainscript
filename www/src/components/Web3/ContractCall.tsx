// ContractCall.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { convertCustomAbiToEthersFormat } from "../../utils/abiUtils";

import type { AccountAddress, CodeAbi } from "@backend/types/account.types";


interface ContractCallProps {
    contractAddress: AccountAddress;
    contractAbi: CodeAbi | null;
    selectedMethod: string;
    setSelectedMethod: React.Dispatch<React.SetStateAction<string>>;
    callMethods: string[];
    walletConnected: boolean;
}


const ContractCall: React.FC<ContractCallProps> = ({ contractAddress, contractAbi, selectedMethod, setSelectedMethod, callMethods, walletConnected }) => {
    const [args, setArgs] = useState<string[]>(["0xee5392913a7930c233Aa711263f715f616114e9B"]);
    const [argsNames, setArgsNames] = useState<string[]>(["address"]);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);


    // Met à jour le nombre d'inputs en fonction de la méthode sélectionnée
    useEffect(() => {
        if (!contractAbi || !selectedMethod) return;

        const methodData = contractAbi?.find((c: any) => c.methods[selectedMethod]);
        if (!methodData) return;

        const methodInputs = methodData.methods[selectedMethod].inputs ?? [];
        setArgs(new Array(methodInputs.length).fill(""));
        setArgsNames(methodInputs);
    }, [selectedMethod, contractAbi]);


    const callContract = async () => {
        try {
            if (!window.ethereum) return alert("Wallet non connecté");
            if (!contractAbi) return alert("Pas d'ABI trouvé");
            if (!selectedMethod) return alert("Aucune fonction sélectionné");

            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            const ethersAbi = convertCustomAbiToEthersFormat(contractAbi);
            const contract = new ethers.Contract(contractAddress, ethersAbi, provider);
            const res = await contract[selectedMethod](...args);
            setResult(res.toString());

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

                {args.map((arg, index) => (
                    <input
                        key={index}
                        type="text"
                        className="form-control mb-2"
                        placeholder={argsNames[index]}
                        value={arg}
                        onChange={(e) => {
                            const newArgs = [...args];
                            newArgs[index] = e.target.value;
                            setArgs(newArgs);
                        }}
                    />
                ))}
            </div>

            <button className="btn btn-primary w-100" onClick={callContract} disabled={!walletConnected || loading}>
                {loading ? "⏳ Appel en cours..." : "🔍 Exécuter"}
            </button>

            {result && <p className="alert alert-success mt-3">Résultat: {result}</p>}
        </div>
    );
};


export default ContractCall;
