// AMMRouter.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractsAddresses } from "@frontend/config.client";
import { AMMRouterAbi } from "@frontend/abi/AMMRouterAbi";
import { TokenAbi } from "@frontend/abi/TokenAbi";

import { callSmartContract, executeSmartContract } from "@frontend/utils/contractUtils";
import ConnectWallet from "@frontend/components/Web3/ConnectWallet";
import { jsonReviver } from "@frontend/utils/jsonUtils";

import type { AccountAddress } from "@backend/types/account.types";


const AMMRouterAddress = contractsAddresses.AmmRouter as AccountAddress;


const AMMRouter: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<AccountAddress | null>(null);
    const [pairs, setPairs] = useState<{ [pair: AccountAddress]: { tokenA: AccountAddress; tokenB: AccountAddress } }>({});
    const [loading, setLoading] = useState(false);

    // États pour les balances et allowances
    const [balances, setBalances] = useState<{ [token: AccountAddress]: bigint }>({});
    const [allowances, setAllowances] = useState<{ [token: AccountAddress]: bigint }>({});
    const [approveAmounts, setApproveAmounts] = useState<{ [token: AccountAddress]: bigint }>({});

    // États pour la gestion de l'ajout de paire
    const [pairAddress, setPairAddress] = useState<AccountAddress | null>(null);
    const [tokenA, setTokenA] = useState<AccountAddress | null>(null);
    const [tokenB, setTokenB] = useState<AccountAddress | null>(null);

    // États pour la recherche de la meilleure paire
    const [tokenIn, setTokenIn] = useState<AccountAddress | null>(null);
    const [tokenOut, setTokenOut] = useState<AccountAddress | null>(null);
    const [bestPair, setBestPair] = useState<AccountAddress | null>(null);
    const [bestReserves, setBestReserves] = useState<{ reserveIn: bigint; reserveOut: bigint } | null>(null);

    // États pour le swap
    const [swapAmountIn, setSwapAmountIn] = useState<bigint>(0n);
    const [swapAmountOut, setSwapAmountOut] = useState<string | null>(null);
    const [swapSlippage, setSwapSlippage] = useState<bigint>(0n);

    useEffect(() => {
        fetchPairs();
    }, [walletAddress]);

    useEffect(() => {
        fetchBalancesAndAllowances();
    }, [pairs]);

    const fetchPairs = async () => {
        if (!walletAddress || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const result = await callSmartContract(provider, AMMRouterAddress, AMMRouterAbi, "pairs", []);

            console.log("Pairs:", result);
            setPairs(JSON.parse(result, jsonReviver));

        } catch (error) {
            console.error("Erreur lors de la récupération des paires :", error);
        }
    };

    const fetchBalancesAndAllowances = async () => {
        if (!walletAddress || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const balances: { [token: string]: bigint } = {};
            const allowances: { [token: string]: bigint } = {};

            for (const pair of Object.values(pairs)) {
                for (const token of [pair.tokenA, pair.tokenB]) {
                    if (!balances[token]) {
                        balances[token] = BigInt(await callSmartContract(provider, token, TokenAbi, "balanceOf", [walletAddress]));
                    }

                    if (!allowances[token]) {
                        allowances[token] = BigInt(await callSmartContract(provider, token, TokenAbi, "allowance", [walletAddress, AMMRouterAddress]));
                    }
                }
            }

            setBalances(balances);
            setAllowances(allowances);

        } catch (error) {
            console.error("Erreur lors de la récupération des balances/allowances :", error);
        }
    };

    const approveToken = async (token: AccountAddress, amount: bigint) => {
        if (!walletAddress || !window.ethereum) return;
        if (!amount) return alert("Veuillez entrer un montant valide");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, token, TokenAbi, "approve", [AMMRouterAddress, amount.toString()]);
            fetchBalancesAndAllowances();

        } catch (error) {
            console.error("Erreur lors de l'approbation du token :", error);

        } finally {
            setLoading(false);
        }
    };

    const registerPair = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!pairAddress || !tokenA || !tokenB) return alert("Veuillez remplir tous les champs");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, AMMRouterAddress, AMMRouterAbi, "registerPair", [pairAddress, tokenA, tokenB]);

            setPairAddress("0x");
            setTokenA("0x");
            setTokenB("0x");
            fetchPairs();

        } catch (error) {
            console.error("Erreur lors de l'ajout de la paire :", error);

        } finally {
            setLoading(false);
        }
    };

    const findBestPair = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!tokenIn || !tokenOut) return alert("Veuillez entrer les tokens");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const result = await callSmartContract(provider, AMMRouterAddress, AMMRouterAbi, "findBestPair", [tokenIn, tokenOut]);

            console.log("Best Pair:", result);
            const parsedResult = JSON.parse(result, jsonReviver);

            setBestPair(parsedResult.bestPair);
            setBestReserves(parsedResult.bestReserves);

        } catch (error) {
            console.error("Erreur lors de la recherche de la meilleure paire :", error);

        } finally {
            setLoading(false);
        }
    };

    const swapTokens = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!tokenIn || !tokenOut || !swapAmountIn) return alert("Veuillez entrer les valeurs nécessaires");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            await executeSmartContract(provider, AMMRouterAddress, AMMRouterAbi, "swap", [tokenIn, tokenOut, swapAmountIn.toString()]);

            setSwapAmountIn(0n);
            setSwapAmountOut(null);
            fetchPairs();

        } catch (error) {
            console.error("Erreur lors du swap de tokens :", error);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-3">🌊 AMM Router</h2>

            <ConnectWallet onConnect={setWalletAddress} />


            {/* Balances & Allowances */}
            <div className="card p-3 mb-3">
                <h5>💰 Balances & Allowances</h5>
                <ul className="list-group">
                    {Object.entries(balances).map(([token, balance]) => (
                        <li key={token} className="list-group-item">
                            <strong>{token} :</strong> {balance.toString()} | Allowance : {allowances[token as AccountAddress]?.toString() ?? "0"}
                        </li>
                    ))}
                </ul>
                <button className="btn btn-outline-secondary btn-sm mt-2" onClick={fetchBalancesAndAllowances} disabled={!walletAddress}>
                    🔄 Rafraîchir
                </button>

                {Object.keys(balances).map((token) => (
                    <div key={token} className="d-flex gap-2 mt-2">
                        <input
                            className="form-control"
                            placeholder={`Approve ${token}`}
                            value={approveAmounts[token as AccountAddress]?.toString() ?? ""}
                            onChange={(e) => setApproveAmounts({ ...approveAmounts, [token]: BigInt(e.target.value) })}
                        />

                        <button className="btn btn-primary" onClick={() => approveToken(token as AccountAddress, approveAmounts[token as AccountAddress])} disabled={loading || !walletAddress}>
                            ✅ Approuver
                        </button>
                    </div>
                ))}
            </div>

            {/* Affichage des paires enregistrées */}
            <div className="card p-3 mb-3">
                <h5>🔗 Paires enregistrées</h5>

                <ul className="list-group">
                    {Object.entries(pairs).map(([pair, { tokenA, tokenB }]) => (
                        <li key={pair} className="list-group-item">
                            <strong>{pair} :</strong> {tokenA} ↔ {tokenB}
                        </li>
                    ))}
                </ul>

                <button className="btn btn-outline-secondary btn-sm mt-2" onClick={fetchPairs} disabled={!walletAddress}>
                    🔄 Rafraîchir
                </button>
            </div>

            {/* Ajouter une paire */}
            <div className="card p-3 mb-3">
                <h5>➕ Ajouter une paire</h5>

                <input className="form-control mb-2" placeholder="Adresse de la paire" value={pairAddress ?? ''} onChange={(e) => setPairAddress(e.target.value as AccountAddress)} />
                <input className="form-control mb-2" placeholder="Token A" value={tokenA ?? ''} onChange={(e) => setTokenA(e.target.value as AccountAddress)} />
                <input className="form-control mb-2" placeholder="Token B" value={tokenB ?? ''} onChange={(e) => setTokenB(e.target.value as AccountAddress)} />

                <button className="btn btn-success w-100" onClick={registerPair} disabled={loading || !walletAddress}>
                    {loading ? "⏳ Ajout..." : "➕ Ajouter"}
                </button>
            </div>

            {/* Trouver la meilleure paire */}
            <div className="card p-3 mb-3">
                <h5>🔍 Trouver la meilleure paire</h5>

                <input className="form-control mb-2" placeholder="Token Entrée" value={tokenIn ?? ''} onChange={(e) => setTokenIn(e.target.value as AccountAddress)} />
                <input className="form-control mb-2" placeholder="Token Sortie" value={tokenOut ?? ''} onChange={(e) => setTokenOut(e.target.value as AccountAddress)} />

                <button className="btn btn-primary w-100" onClick={findBestPair} disabled={loading || !walletAddress}>
                    {loading ? "⏳ Recherche..." : "🔍 Trouver"}
                </button>
            </div>

            {/* Swap */}
            <div className="card p-3">
                <h5>🔄 Swap</h5>

                <input
                    type="number"
                    className="form-control mb-2"
                    placeholder="Montant Entrée"
                    value={swapAmountIn.toString()}
                    onChange={(e) => setSwapAmountIn(BigInt(e.target.value))}
                    />

                <button className="btn btn-warning w-100" onClick={swapTokens} disabled={loading || !walletAddress}>
                    {loading ? "⏳ Swap en cours..." : "🔄 Swap"}
                </button>
            </div>
        </div>
    );
};


export default AMMRouter;
