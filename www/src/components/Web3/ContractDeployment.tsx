// ContractDeployment.tsx

import axios from "axios";
import React, { useEffect, useState } from "react";
import { AbiCoder, ethers } from "ethers";


const ContractDeployment: React.FC<{ walletConnected: boolean }> = ({ walletConnected }) => {
    const [contracts, setContracts] = useState<string[]>([]);
    const [selectedContract, setSelectedContract] = useState<string | null>(null);
    const [code, setCode] = useState<string>("");
    const [contractAddress, setContractAddress] = useState<string | null>(null);
    const constructorParamsJSON = ""; // not used yet. argument required by the blockchain

    // Récupération de la liste des contrats d'exemple
    useEffect(() => {
        axios.get<{ contracts: string[] }>("/api/contracts/examples/list")
            .then(response => setContracts(response.data.contracts))
            .catch(error => console.error("Erreur lors du chargement des contrats", error));
    }, []);

    // Récupération du code source du contrat sélectionné
    const fetchContractCode = async (contractName: string) => {
        try {
            const response = await axios.get<{ code: string }>(`/api/contracts/examples/${contractName}/code`);
            setCode(response.data.code);

        } catch (error) {
            console.error("Erreur lors du chargement du code du contrat", error);
            setCode("");
        }
    };

    // Déploiement du contrat sélectionné (ou saisi manuellement)
    const deploy = async () => {
        if (!window.ethereum) return alert("Wallet non connecté");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const coder = new AbiCoder();
        const bytecode = coder.encode(["string", "string"], [code, constructorParamsJSON]);

        const factory = new ethers.ContractFactory([], bytecode, signer);
        const contract = await factory.deploy();

        await contract.deploymentTransaction()?.wait();

        setContractAddress(await contract.getAddress());
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Déploiement de contrat</h2>

            {/* Sélecteur de contrat */}
            <div className="mb-3">
                <label htmlFor="contractSelect" className="form-label">Choisir un contrat :</label>
                <select
                    id="contractSelect"
                    className="form-select"
                    onChange={(e) => {
                        const contractName = e.target.value;
                        setSelectedContract(contractName);
                        fetchContractCode(contractName);
                    }}
                >
                    <option value="">-- Sélectionnez un contrat --</option>
                    {contracts.map(contract => (
                        <option key={contract} value={contract}>{contract}</option>
                    ))}
                </select>
            </div>

            {/* Zone de texte pour modifier le code du contrat */}
            <div className="mb-3">
                <label htmlFor="contractCode" className="form-label">Code du contrat :</label>
                <textarea
                    id="contractCode"
                    rows={10}
                    className="form-control"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                ></textarea>
            </div>

            {/* Bouton de déploiement */}
            <button className="btn btn-primary w-100" onClick={deploy} disabled={!walletConnected || !code.trim()}>
                Déployer
            </button>

            {/* Affichage de l'adresse du contrat déployé */}
            {contractAddress && (
                <div className="alert alert-success mt-3">
                    ✅ Contrat déployé à : <strong>{contractAddress}</strong>
                </div>
            )}
        </div>
    );
};

export default ContractDeployment;
