// ContractExecute.tsx

import React, { useEffect, useState } from "react";
import { ContractTransactionResponse, ethers } from "ethers";
import { convertCustomAbiToEthersFormat } from "../../utils/abiUtils";

import type { AccountAddress, CodeAbi } from "@backend/types/account.types";


interface ContractExecuteProps {
    contractAddress: AccountAddress;
    contractAbi: CodeAbi | null;
    selectedMethod: string;
    setSelectedMethod: React.Dispatch<React.SetStateAction<string>>;
    executeMethods: string[];
    walletConnected: boolean;
}


const ContractExecute: React.FC<ContractExecuteProps> = ({ contractAddress, contractAbi, selectedMethod, setSelectedMethod, executeMethods, walletConnected }) => {
    const [args, setArgs] = useState<string[]>(["0x0000000000000000000000000000000000000020", "10"]);
    const [argsNames, setArgsNames] = useState<string[]>(["address"]);
    const [loading, setLoading] = useState(false);
    const [txHistory, setTxHistory] = useState<{ tx: ContractTransactionResponse, receipt: ethers.ContractTransactionReceipt | null }[]>([]);


    // Met à jour le nombre d'inputs en fonction de la méthode sélectionnée
    useEffect(() => {
        if (!contractAbi || !selectedMethod) return;

        const methodData = contractAbi?.find((c: any) => c.methods[selectedMethod]);
        if (!methodData) return;

        const methodInputs = methodData.methods[selectedMethod].inputs ?? [];
        setArgs(new Array(methodInputs.length).fill(""));
        setArgsNames(methodInputs);
    }, [selectedMethod, contractAbi]);


    const executeContract = async () => {
        try {
            if (!window.ethereum) return alert("Wallet non connecté");
            if (!contractAbi) return alert("Pas d'ABI trouvé");
            if (!selectedMethod) return alert("Aucune fonction sélectionné");

            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const ethersAbi = convertCustomAbiToEthersFormat(contractAbi);
            const contract = new ethers.Contract(contractAddress, ethersAbi, signer);

            const tx: ContractTransactionResponse = await contract[selectedMethod](...args);
            console.log('Transaction envoyée:', tx);

            const receipt = await tx.wait();
            console.log('Transaction confirmée:', receipt);

            setTxHistory(prev => [...prev, { tx, receipt }]);

        } catch (err: any) {
            console.error("Erreur d'exécution:", err);
            alert("Erreur: " + err.message);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h4 className="mb-3">🚀 Exécution d'un contrat</h4>

            <div className="mb-3">
                <label className="form-label">Méthode</label>

                <select className="form-select" value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
                    {executeMethods.map(method => (
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
                        value={arg}
                        placeholder={argsNames[index]}
                        onChange={(e) => {
                            const newArgs = [...args];
                            newArgs[index] = e.target.value;
                            setArgs(newArgs);
                        }}
                    />
                ))}
            </div>

            <button className="btn btn-danger w-100" onClick={executeContract} disabled={!walletConnected || loading}>
                {loading ? "⏳ Transaction en cours..." : "🚀 Exécuter"}
            </button>

            <hr />

            <div>
                <h5>Historique des Transactions</h5>

                <ul className="list-group">
                    {txHistory.map((tx, index) => (
                        <li key={index} className="list-group-item">
                            Tx: {tx.tx.hash} | Status: {tx.receipt?.status ? "✅ Success" : "❌ Failed"}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};



export default ContractExecute;
