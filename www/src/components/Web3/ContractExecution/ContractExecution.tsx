// ContractExecution.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";

import ContractCall from "./ContractCall";
import ContractExecute from "./ContractExecute";

import { AccountAddress, CodeAbi } from "@backend/types/account.types";
import AccountSelectorModal from "../AccountSelectorModal";
import { extractAbiMethods } from "../../../utils/abiUtils";


const ContractExecution: React.FC<{ walletConnected: boolean }> = ({ walletConnected }) => {
    const [contractAddress, setContractAddress] = useState<AccountAddress>("0x3B7665Ae1f373e651Dc46FD4BBC0637949B1ad7d");
    const [showModal, setShowModal] = useState(false);
    const [contractAbi, setContractAbi] = useState<CodeAbi | null>(null);
    const [callMethods, setCallMethods] = useState<string[]>([]);
    const [executeMethods, setExecuteMethods] = useState<string[]>([]);

    const [selectedCallMethod, setSelectedCallMethod] = useState<string>("");
    const [selectedExecuteMethod, setSelectedExecuteMethod] = useState<string>("");


    // Récupération de l'ABI du contrat sélectionné
    useEffect(() => {
        if (!contractAddress) return;

        const fetchAbi = async () => {
            try {
                const response = await axios.get<{ abi: CodeAbi }>(`/api/accounts/${contractAddress}/abi`);
                setContractAbi(response.data.abi);
                extractMethods(response.data.abi);

            } catch (error) {
                console.error("Erreur lors de la récupération de l'ABI:", error);
                setContractAbi(null);
                setCallMethods([]);
                setExecuteMethods([]);
            }
        };

        fetchAbi();
    }, [contractAddress]);

    // Extraire les méthodes de l'ABI
    const extractMethods = (abi: CodeAbi) => {
        const { calls, executes } = extractAbiMethods(abi);

        setCallMethods(calls);
        setExecuteMethods(executes);
        setSelectedCallMethod(calls[0] || "");
        setSelectedExecuteMethod(executes[0] || "");
    };


    return (
        <div className="container mt-3">
            <h2>Exécution d'un contrat</h2>

            <div className="mb-3">
                <label className="form-label">Adresse du contrat</label>

                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        value={contractAddress}
                        onChange={(e) => setContractAddress(e.target.value as AccountAddress)}
                    />

                    <button className="btn btn-outline-secondary" type="button" onClick={() => setShowModal(true)}>
                        ...
                    </button>
                </div>
            </div>

            {/* Modal pour sélectionner un compte */}
            <AccountSelectorModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSelect={(account) => setContractAddress(account as AccountAddress)}
            />

            {!contractAbi && <div>Cette adresse n'est pas un smart contract</div>}

            {contractAbi && 
                <div className="d-flex">
                    {/* Sélection de la méthode Call */}
                    <ContractCall
                        contractAddress={contractAddress}
                        contractAbi={contractAbi}
                        selectedMethod={selectedCallMethod}
                        setSelectedMethod={setSelectedCallMethod}
                        callMethods={callMethods}
                        walletConnected={walletConnected}
                    />

                    {/* Sélection de la méthode Execute */}
                    <ContractExecute
                        contractAddress={contractAddress}
                        contractAbi={contractAbi}
                        selectedMethod={selectedExecuteMethod}
                        setSelectedMethod={setSelectedExecuteMethod}
                        executeMethods={executeMethods}
                        walletConnected={walletConnected}
                    />
                </div>
            }
        </div>
    );
};


const contractAbi: CodeAbi = [
    {
        class: "ContractToken1",
        methods: {
            balanceOf: { inputs: ["_address"] },
            transfer: { inputs: ["recipient", "amount"], write: true },
        },
        attributes: {},
    },
];


export default ContractExecution;
