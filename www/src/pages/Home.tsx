// Home.tsx

import React, { useState } from "react";

import { chainId, chainName, decimals, symbol } from "../config.client";


const rpcHost = window.location.host;


const Home: React.FC = () => {
    const [isAdding, setIsAdding] = useState(false);
    const [added, setAdded] = useState(false);

    async function addChainToMetamask() {
        const explorerUrlSsl = `${location.protocol}//${rpcHost}`;

        const chainIdHex = "0x" + (chainId).toString(16);
        const rpcUrls = [explorerUrlSsl]; //.map(url => url.replace('http://', 'https://'));
        const blockExplorerUrls = [explorerUrlSsl]; //.map(url => url.replace('http://', 'https://'));

        const nativeCurrency = {
            name: symbol,
            symbol,
            decimals,
        };

        setIsAdding(true);

        try {
            await (window as any).ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{ chainId: chainIdHex, chainName, nativeCurrency, rpcUrls, blockExplorerUrls }],
            });
            setAdded(true);

        } catch (err: any) {
            console.warn("Failed to add chain:", err);
        }

        setIsAdding(false);
    }

    return (
        <div className="container mt-5 text-center">
            <h1 className="mb-4">🚀 Bienvenue sur <span className="text-primary">ChainScript Explorer</span></h1>

            <p className="lead">Votre portail vers une blockchain rapide, légère et modulaire.</p>

            <div className="card p-4 mt-4 shadow-sm">
                <h4>🌐 Informations sur la blockchain</h4>

                <ul className="list-group text-start">
                    <li className="list-group-item"><strong>Réseau :</strong> DEV (Localhost)</li>
                    <li className="list-group-item"><strong>Chain ID :</strong> 9999999999</li>
                    <li className="list-group-item"><strong>Monnaie native :</strong> DEV</li>
                    <li className="list-group-item"><strong>Explorateur :</strong> <a href={`http://${rpcHost}`} target="_blank">Explorer Local</a></li>
                </ul>

                <button 
                    className={`btn ${added ? "btn-success" : "btn-primary"} mt-3 w-100`} 
                    onClick={addChainToMetamask} 
                    disabled={isAdding || added}
                >
                    {isAdding ? "⏳ Ajout en cours..." : added ? "✅ Réseau ajouté à Metamask" : "➕ Ajouter à Metamask"}
                </button>
            </div>
        </div>
    );
};


export default Home;
