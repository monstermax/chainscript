// Home.tsx

import React, { useEffect, useState } from "react";

import { chainId, chainName, decimals, symbol } from "../config.client";
import { createEthWallet } from "../utils/accountsUtils";

import { AccountAddress } from "@backend/types/account.types";


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

            <div>
                <CreateWalletComponent />

                <FaucetComponent />
            </div>
        </div>
    );
};


const CreateWalletComponent: React.FC = () => {
    const [wallet, setWallet] = useState<{ address: string; privateKey: string, mnemonic?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const createWallet = async () => {
        setLoading(true);
        try {
            //const response = await fetch(`${location.protocol}//${rpcHost}/`, {
            //    method: "POST",
            //    headers: { "Content-Type": "application/json" },
            //    body: JSON.stringify({ jsonrpc: "2.0", method: "wallet_create", params: [], id: 1 })
            //});
            //const data = await response.json();

            //if (data.error) {
            //    throw new Error(data.error.message);
            //}

            //setWallet(data.result);
            const wallet = createEthWallet();
            setWallet(wallet);

        } catch (error: any) {
            alert(`Erreur: ${error.message}`);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card p-3 mt-3">
            <h5>🔑 Créer un Wallet</h5>
            <button className="btn btn-success w-100" onClick={createWallet} disabled={loading}>
                {loading ? "⏳ Création..." : "🆕 Générer un wallet"}
            </button>
            {wallet && (
                <div className="mt-3 p-2 bg-dark text-white rounded text-break">
                    <p><strong>Adresse:</strong> {wallet.address}</p>
                    <p><strong>Clé privée:</strong> {wallet.privateKey}</p>
                    <p><strong>Seed:</strong> {wallet.mnemonic ?? '-'}</p>
                </div>
            )}
        </div>
    );
};


const FaucetComponent: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [address, setAddress] = useState<AccountAddress | null>(null);

    useEffect(() => {
        requestWallet();
    }, [])

    const requestWallet = async () => {
        if (!window.ethereum) return; // alert("Connectez votre wallet");

        const accounts: AccountAddress[] = await window.ethereum.request({ method: "eth_requestAccounts" }) as AccountAddress[];
        const address = accounts[0];

        setAddress(address);
    };

    const requestFaucet = async () => {
        if (!window.ethereum) return; // alert("Connectez votre wallet");

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`${location.protocol}//${rpcHost}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jsonrpc: "2.0", method: "eth_faucet", params: [address], id: 1 })
            });
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            setMessage(`✅ Faucet envoyé à ${address}`);

        } catch (error: any) {
            setMessage(`❌ Erreur: ${error.message}`);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card p-3 mt-3">
            <h5>💧 Faucet</h5>

            <div className="input-group mb-2">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Entrez votre adresse"
                    value={address ?? ''}
                    onChange={(e) => setAddress(e.target.value as AccountAddress)}
                />
            </div>

            <button className="btn btn-primary w-100" onClick={requestFaucet} disabled={loading || !address}>
                {loading ? "⏳ Demande en cours..." : "🚰 Demander des tokens"}
            </button>

            {message && (
                <p className="mt-2 p-2 bg-dark text-white rounded text-break text-center">
                    {message}
                </p>
            )}

        </div>
    );

};

export default Home;
