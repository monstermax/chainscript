// Web3.tsx

import React, { useState } from "react";

import { useWeb3 } from "@frontend/components/Web3Provider";

import Balance from "@frontend/components/Web3/Balance";
import ContractDeployment from "@frontend/components/Web3/ContractDeployment/ContractDeployment";
import ContractExecution from "@frontend/components/Web3/ContractExecution/ContractExecution";


const Web3: React.FC = () => {
    const { walletAddress } = useWeb3();
    const [activeTab, setActiveTab] = useState("balance");

    return (
        <div className="container mt-4">
            <h2>Web3 Interaction</h2>

            {/* Onglets Bootstrap */}
            <ul className="nav nav-tabs">
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === "balance" ? "active" : ""}`} onClick={() => setActiveTab("balance")}>
                        💰 Balance
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === "deploy" ? "active" : ""}`} onClick={() => setActiveTab("deploy")}>
                        🚀 Déploiement
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === "execute" ? "active" : ""}`} onClick={() => setActiveTab("execute")}>
                        ⚡ Exécution
                    </button>
                </li>
            </ul>

            {/* Contenu des onglets */}
            <div className="tab-content">
                {activeTab === "balance" && <Balance walletConnected={!!walletAddress} />}
                {activeTab === "deploy" && <ContractDeployment walletConnected={!!walletAddress} />}
                {activeTab === "execute" && <ContractExecution walletConnected={!!walletAddress} />}
            </div>
        </div>
    );
};


export default Web3;
