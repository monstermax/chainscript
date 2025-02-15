// LPPair.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { callSmartContract, executeSmartContract } from "../components/Web3/contractUtils";
import ConnectWallet from "../components/Web3/ConnectWallet";
import { jsonReviver } from "../utils/jsonUtils";

import type { AccountAddress, CodeAbi } from "@backend/types/account.types";


const contractAddress = "0xd7873deFbdc5c9169704ECC034c1Fe186F766b43";

const LpPairAbi: CodeAbi = [
    {
        class: "LPPair",
        methods: {
            addLiquidity: { inputs: ["amountA", "amountB"], write: true },
            removeLiquidity: { inputs: ["liquidityAmount"], write: true },
            getAmountOut: { inputs: ["amountIn", "reserveIn", "reserveOut"] },
            swap: { inputs: ["tokenIn", "amountIn"], write: true },
            getReserves: { inputs: [] }
        },
        attributes: {
            tokenA: { type: "string" },
            tokenB: { type: "string" },
            reservesA: { type: "bigint" },
            reservesB: { type: "bigint" },
            totalLiquidity: { type: "bigint" },
            liquidityBalances: { type: "object" },
            feePercent: { type: "bigint" }
        }
    }
];

const TokenAbi: CodeAbi = [
    {
        "class": "ContractToken2",
        "methods": {
            "balanceOf": {
                "inputs": [
                    "_address"
                ],
                "write": false
            },
            "transfer": {
                "inputs": [
                    "recipient",
                    "amount"
                ],
                "write": true
            },
            "approve": {
                "inputs": [
                    "spender",
                    "amount"
                ],
                "write": true
            },
            "allowance": {
                "inputs": [
                    "owner",
                    "spender"
                ],
                "write": false
            },
            "transferFrom": {
                "inputs": [
                    "owner",
                    "recipient",
                    "amount"
                ],
                "write": true
            }
        },
        "attributes": {
            "name": {
                "type": "undefined"
            },
            "symbol": {
                "type": "undefined"
            },
            "owner": {
                "type": "string"
            },
            "decimals": {
                "type": "number"
            },
            "supply": {
                "type": "bigint"
            },
            "accounts": {
                "type": "object"
            },
            "allowances": {
                "type": "object"
            }
        }
    }
];

const LPPair: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [reserves, setReserves] = useState<{ tokenA: AccountAddress, tokenB: AccountAddress, reservesA: string, reservesB: string, totalLiquidity: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [amountA, setAmountA] = useState<string>("");
    const [amountB, setAmountB] = useState<string>("");
    const [liquidityAmount, setLiquidityAmount] = useState<string>("");
    const [swapAmount, setSwapAmount] = useState<string>("");
    const [swapToken, setSwapToken] = useState<string>("");
    const [balances, setBalances] = useState<{ balanceA: string, balanceB: string }>({ balanceA: "0", balanceB: "0" });
    const [allowances, setAllowances] = useState<{ allowanceA: string, allowanceB: string }>({ allowanceA: "0", allowanceB: "0" });
    const [approveAmountA, setApproveAmountA] = useState<string>("");
    const [approveAmountB, setApproveAmountB] = useState<string>("");

    useEffect(() => {
        fetchReserves();
    }, [walletAddress]);


    const fetchReserves = async () => {
        if (!walletAddress || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const result = await callSmartContract(provider, contractAddress, LpPairAbi, "getReserves", []);

            console.log("Reserves:", result);

            const parsedReserves = JSON.parse(result, jsonReviver);
            console.log('parsed getReserves result:', parsedReserves);

            setReserves(parsedReserves);

        } catch (error) {
            console.error("Erreur lors de la récupération des réserves :", error);
        }
    };

    const fetchBalancesAndAllowances = async () => {
        if (!walletAddress || !reserves || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);

            const balanceA = await callSmartContract(provider, reserves.tokenA, TokenAbi, "balanceOf", [walletAddress]);
            const balanceB = await callSmartContract(provider, reserves.tokenB, TokenAbi, "balanceOf", [walletAddress]);

            const allowanceA = await callSmartContract(provider, reserves.tokenA, TokenAbi, "allowance", [walletAddress, contractAddress]);
            const allowanceB = await callSmartContract(provider, reserves.tokenB, TokenAbi, "allowance", [walletAddress, contractAddress]);

            setBalances({ balanceA: balanceA.toString(), balanceB: balanceB.toString() });
            setAllowances({ allowanceA: allowanceA.toString(), allowanceB: allowanceB.toString() });

        } catch (error) {
            console.error("Erreur lors de la récupération des balances/allowances :", error);
        }
    };

    const approveToken = async (token: AccountAddress, amount: string) => {
        if (!walletAddress || !window.ethereum) return;
        if (!amount.trim()) return alert("Veuillez entrer un montant valide");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, token, TokenAbi, "approve", [contractAddress, amount]);

            fetchBalancesAndAllowances(); // Rafraîchir après approbation

        } catch (error) {
            console.error("Erreur lors de l'approbation du token :", error);

        } finally {
            setLoading(false);
        }
    };

    const addLiquidity = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!amountA.trim() || !amountB.trim()) return alert("Veuillez entrer des montants valides");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, contractAddress, LpPairAbi, "addLiquidity", [amountA, amountB]);

            setAmountA("");
            setAmountB("");
            fetchReserves();

        } catch (error) {
            console.error("Erreur lors de l'ajout de liquidité :", error);

        } finally {
            setLoading(false);
        }
    };

    const removeLiquidity = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!liquidityAmount.trim()) return alert("Veuillez entrer un montant valide");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, contractAddress, LpPairAbi, "removeLiquidity", [liquidityAmount]);

            setLiquidityAmount("");
            fetchReserves();

        } catch (error) {
            console.error("Erreur lors du retrait de liquidité :", error);

        } finally {
            setLoading(false);
        }
    };

    const swapTokens = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!swapAmount.trim() || !swapToken.trim()) return alert("Veuillez entrer les valeurs nécessaires");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, contractAddress, LpPairAbi, "swap", [swapToken, swapAmount]);

            setSwapAmount("");
            setSwapToken("");
            fetchReserves();

        } catch (error) {
            console.error("Erreur lors du swap de tokens :", error);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-3">💧 LPPair - Liquidity Pool</h2>

            <ConnectWallet onConnect={setWalletAddress} />

            {/* Affichage des réserves */}
            {reserves && (
                <div className="card p-3 mb-3">
                    <h5>📊 Réserves actuelles :</h5>
                    <p><strong>{reserves.tokenA} :</strong> {reserves.reservesA}</p>
                    <p><strong>{reserves.tokenB} :</strong> {reserves.reservesB}</p>
                    <p><strong>Liquidité totale :</strong> {reserves.totalLiquidity}</p>

                    <button className="btn btn-outline-secondary btn-sm" onClick={fetchReserves} disabled={!walletAddress} title="Rafraîchir">
                        🔄 Rafraîchir
                    </button>
                </div>
            )}

            {/* Balances et Allowances */}
            {reserves && (
                <div className="card p-3 mb-3">
                    <h5>💰 Balances & Allowances</h5>

                    <p><strong>{reserves.tokenA} :</strong> {balances.balanceA} | Allowance : {allowances.allowanceA}</p>
                    <p><strong>{reserves.tokenB} :</strong> {balances.balanceB} | Allowance : {allowances.allowanceB}</p>

                    <button className="btn btn-outline-secondary btn-sm mb-2" onClick={fetchBalancesAndAllowances} disabled={!walletAddress}>
                        🔄 Rafraîchir
                    </button>

                    {/* Approve Tokens */}
                    <div className="d-flex gap-2">
                        <input
                            className="form-control"
                            placeholder="Approve Token A"
                            value={approveAmountA}
                            onChange={(e) => setApproveAmountA(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={() => approveToken(reserves.tokenA, approveAmountA)} disabled={loading || !walletAddress}>
                            ✅ Approuver
                        </button>
                    </div>

                    <div className="d-flex gap-2 mt-2">
                        <input
                            className="form-control"
                            placeholder="Approve Token B"
                            value={approveAmountB}
                            onChange={(e) => setApproveAmountB(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={() => approveToken(reserves.tokenB, approveAmountB)} disabled={loading || !walletAddress}>
                            ✅ Approuver
                        </button>
                    </div>
                </div>
            )}


            {/* Ajouter de la liquidité */}
            <div className="card p-3 mb-3">
                <h5>➕ Ajouter de la liquidité</h5>
                <input
                    className="form-control mb-2"
                    placeholder="Montant Token A"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                />
                <input
                    className="form-control mb-2"
                    placeholder="Montant Token B"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                />
                <button className="btn btn-success w-100" onClick={addLiquidity} disabled={loading || !walletAddress}>
                    {loading ? "⏳ Ajout..." : "➕ Ajouter"}
                </button>
            </div>

            {/* Retirer de la liquidité */}
            <div className="card p-3 mb-3">
                <h5>➖ Retirer de la liquidité</h5>
                <input
                    className="form-control mb-2"
                    placeholder="Montant de liquidité"
                    value={liquidityAmount}
                    onChange={(e) => setLiquidityAmount(e.target.value)}
                />
                <button className="btn btn-danger w-100" onClick={removeLiquidity} disabled={loading || !walletAddress}>
                    {loading ? "⏳ Retrait..." : "➖ Retirer"}
                </button>
            </div>

            {/* Swap de tokens */}
            <div className="card p-3">
                <h5>🔄 Swap de tokens</h5>
                <input
                    className="form-control mb-2"
                    placeholder="Token à échanger (adresse)"
                    value={swapToken}
                    onChange={(e) => setSwapToken(e.target.value)}
                />
                <input
                    className="form-control mb-2"
                    placeholder="Montant à échanger"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                />
                <button className="btn btn-warning w-100" onClick={swapTokens} disabled={loading || !walletAddress}>
                    {loading ? "⏳ Swap en cours..." : "🔄 Swap"}
                </button>
            </div>
        </div>
    );
};


export default LPPair;
