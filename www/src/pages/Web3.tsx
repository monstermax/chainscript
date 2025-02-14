
import React, { useState } from "react";

import Balance from "../components/Web3/Balance";
import ContractDeployment from "../components/Web3/ContractDeployment";
import ContractExecution from "../components/Web3/ContractExecution";
import ConnectWallet from "../components/Web3/ConnectWallet";


const Web3: React.FC = () => {
    const [activeTab, setActiveTab] = useState("balance");
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    return (
        <div className="container mt-4">
            <h2>Web3 Interaction</h2>

            {/* 🔌 Gestion du Wallet */}
            <ConnectWallet onConnect={setWalletAddress} />

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
            <div className="tab-content mt-3">
                {activeTab === "balance" && <Balance walletConnected={!!walletAddress} />}
                {activeTab === "deploy" && <ContractDeployment walletConnected={!!walletAddress} />}
                {activeTab === "execute" && <ContractExecution walletConnected={!!walletAddress} />}
            </div>
        </div>
    );
};


export default Web3;
