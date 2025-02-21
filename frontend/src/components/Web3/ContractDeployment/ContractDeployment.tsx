// ContractDeployment.tsx

import axios from "axios";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { extractClassNamesWithAcorn, extractConstructorParamsWithAcorn } from "@frontend/utils/abiUtils";
import { deployContract } from "@frontend/utils/contractUtils";


const defaultCode = `\nclass MyContract {}\n`;


const ContractDeployment: React.FC<{ walletConnected: boolean }> = ({ walletConnected }) => {
    const [contracts, setContracts] = useState<string[]>([]);
    const [selectedContract, setSelectedContract] = useState<string | null>(null);
    const [code, setCode] = useState<string>(defaultCode);
    const [previousCode, setPreviousCode] = useState<string>(code); // Sauvegarde du code précédent
    const [contractAddress, setContractAddress] = useState<string | null>(null);
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [className, setClassName] = useState<string | null>(null);
    const [constructorParamsNames, setConstructorParamsNames] = useState<string[]>([]);
    const [constructorParamsValues, setConstructorParamsValues] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);


    const analyzeClasses = function (code: string) {
        const classNames = extractClassNamesWithAcorn(code);
        //console.log('classNames:', classNames)
        setAvailableClasses(classNames);
        setClassName(classNames[0] || null); // prend la 1ere classe trouvée

        if (classNames.length > 0) {
            extractConstructorParams(code, classNames[0]); // Analyse le constructeur

        } else {
            setConstructorParamsNames([]); 
            setConstructorParamsValues([]);
        }
    }

    const extractConstructorParams = (code: string, selectedClass: string) => {
        try {
            const constructorParams: string[] = extractConstructorParamsWithAcorn(code, selectedClass);
            setConstructorParamsNames(constructorParams);
            setConstructorParamsValues(new Array(constructorParams.length).fill(""));

        } catch (error) {
            console.error("Erreur lors de l'extraction du constructeur:", error);
            setConstructorParamsNames([]);
            setConstructorParamsValues([]);
        }
    };
    

    const handleCodeBlur = () => {
        if (code !== previousCode) {
            analyzeClasses(code);
            setPreviousCode(code);
        }
    };

    // Récupération de la liste des contrats d'exemple
    useEffect(() => {
        analyzeClasses(code);

        axios.get<{ contracts: string[] }>("/api/contracts/examples/list")
            .then(response => setContracts(response.data.contracts))
            .catch(error => console.error("Erreur lors du chargement des contrats", error));
    }, []);

    // Récupération du code source du contrat sélectionné
    const fetchContractCode = async (contractName: string) => {
        if (contractName) {
            try {
                const response = await axios.get<{ code: string }>(`/api/contracts/examples/${contractName}/code`);
                setCode(response.data.code);
                setPreviousCode(response.data.code);
                analyzeClasses(response.data.code);
                return;

            } catch (error) {
                console.error("Erreur lors du chargement du code du contrat", error);
            }
        }

        setCode(defaultCode);
        setAvailableClasses([]);
        //setClassName(null);
        analyzeClasses(defaultCode);
    };

    // Déploiement du contrat sélectionné (ou saisi manuellement)
    const deploy = async () => {
        try {
            if (!window.ethereum) return alert("Wallet non connecté");
            if (className === null) return;

            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            const contractAddress = await deployContract(provider, code, className, constructorParamsValues);
            setContractAddress(contractAddress);

        } catch (err: any) {
            console.error("Erreur de déploiement:", err);
            alert("Erreur: " + err.message);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Déploiement de contrat</h2>

            {/* Sélecteur de contrat */}
            <div className="mb-3">
                <label htmlFor="contractSelect" className="form-label">Charger un modèle :</label>

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

            {/* Sélecteur de classe détectée */}
            <div className="mb-3">
                <label htmlFor="classSelect" className="form-label">Choisir la classe à déployer :</label>

                {true && (
                    <select
                        id="classSelect"
                        className="form-select"
                        value={className || ""}
                        onChange={(e) => {
                            setClassName(e.target.value);
                            extractConstructorParams(code, e.target.value);
                        }}
                    >
                        {availableClasses.map(classItem => (
                            <option key={classItem} value={classItem}>{classItem}</option>
                        ))}
                    </select>
                )}

                {availableClasses.length === 0 && selectedContract && (
                    <div className="alert alert-danger mt-3">
                        <strong>❌ Erreur :</strong> Aucune classe trouvée dans le code.
                    </div>
                )}
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
                    onBlur={handleCodeBlur}
                ></textarea>
            </div>

            {constructorParamsNames.length > 0 && (
                <div className="mb-3">
                    <label className="form-label">Arguments du constructeur :</label>
                    {constructorParamsNames.map((param, index) => (
                        <input
                            key={index}
                            type="text"
                            className="form-control mb-2"
                            placeholder={param}
                            value={constructorParamsValues[index] || ""}
                            onChange={(e) => {
                                const params = [...constructorParamsValues];
                                params[index] = e.target.value;
                                setConstructorParamsValues(params);
                            }}
                        />
                    ))}
                </div>
            )}


            {/* Bouton de déploiement */}
            <button className="btn btn-primary w-100" onClick={deploy} disabled={!walletConnected || !code.trim() || loading}>
                {loading ? "⏳ Déploiement en cours..." : "🔍 Déployer"}
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
