// LPPair.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { LPPairAddress } from "../../../config.client";
import { divideBigInt } from "../../../utils/numberUtils";
import { callSmartContract, executeSmartContract } from "../../../utils/contractUtils";

import ConnectWallet from "../../Web3/ConnectWallet";
import { jsonReviver } from "../../../utils/jsonUtils";
import { LPPairAbi } from "../../../abi/LPPairAbi";
import { TokenAbi } from "../../../abi/TokenAbi";

import type { AccountAddress } from "@backend/types/account.types";


const LPPair: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [reserves, setReserves] = useState<{ tokenA: AccountAddress, tokenB: AccountAddress, reservesA: string, reservesB: string, totalLiquidity: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [amountA, setAmountA] = useState<bigint>(0n);
    const [amountB, setAmountB] = useState<bigint>(0n);
    const [decimalsA, setDecimalsA] = useState<number | null>(null); // TODO
    const [decimalsB, setDecimalsB] = useState<number | null>(null); // TODO
    const [liquidityAmount, setLiquidityAmount] = useState<bigint>(0n);
    const [swapAmount, setSwapAmount] = useState<string>("");
    const [swapToken, setSwapToken] = useState<string>("");
    const [balances, setBalances] = useState<{ balanceA: bigint, balanceB: bigint }>({ balanceA: 0n, balanceB: 0n });
    const [allowances, setAllowances] = useState<{ allowanceA: bigint, allowanceB: bigint }>({ allowanceA: 0n, allowanceB: 0n });
    const [approveAmountA, setApproveAmountA] = useState<bigint>(0n);
    const [approveAmountB, setApproveAmountB] = useState<bigint>(0n);

    useEffect(() => {
        fetchReserves();
    }, [walletAddress]);

    useEffect(() => {
        fetchDecimals();
        fetchBalancesAndAllowances();
    }, [reserves, allowances]);


    const fetchReserves = async () => {
        if (!walletAddress || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const result = await callSmartContract(provider, LPPairAddress, LPPairAbi, "getReserves", []);

            console.log("Reserves:", result);

            const parsedReserves = JSON.parse(result, jsonReviver);
            console.log('parsed getReserves result:', parsedReserves);

            setReserves(parsedReserves);

        } catch (error) {
            console.error("Erreur lors de la récupération des réserves :", error);
        }
    };

    const fetchDecimals = async () => {
        if (!walletAddress || !reserves || !window.ethereum) return;
        if (decimalsA !== null && decimalsB !== null) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);

            const decimalsA = await callSmartContract(provider, reserves.tokenA, TokenAbi, "decimals", []);
            console.log("decimalsA:", decimalsA);
            setDecimalsA(Number(decimalsA));

            const decimalsB = await callSmartContract(provider, reserves.tokenB, TokenAbi, "decimals", []);
            console.log("decimalsB:", decimalsB);
            setDecimalsB(Number(decimalsB));

        } catch (error) {
            console.error("Erreur lors de la récupération des décimales :", error);
        }
    };

    const fetchBalancesAndAllowances = async () => {
        if (!walletAddress || !reserves || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);

            const balanceA = await callSmartContract(provider, reserves.tokenA, TokenAbi, "balanceOf", [walletAddress]);
            const balanceB = await callSmartContract(provider, reserves.tokenB, TokenAbi, "balanceOf", [walletAddress]);

            const allowanceA = await callSmartContract(provider, reserves.tokenA, TokenAbi, "allowance", [walletAddress, LPPairAddress]);
            const allowanceB = await callSmartContract(provider, reserves.tokenB, TokenAbi, "allowance", [walletAddress, LPPairAddress]);

            setBalances({ balanceA: BigInt(balanceA), balanceB: BigInt(balanceB) });
            setAllowances({ allowanceA: BigInt(allowanceA), allowanceB: BigInt(allowanceB) });

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

            await executeSmartContract(provider, token, TokenAbi, "approve", [LPPairAddress, amount.toString()]);

            fetchBalancesAndAllowances(); // Rafraîchir après approbation

        } catch (error) {
            console.error("Erreur lors de l'approbation du token :", error);

        } finally {
            setLoading(false);
        }
    };

    const addLiquidity = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!amountA || !amountB) return alert("Veuillez entrer des montants valides");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            await executeSmartContract(provider, LPPairAddress, LPPairAbi, "addLiquidity", [amountA.toString(), amountB.toString()]);

            setAmountA(0n);
            setAmountB(0n);
            fetchReserves();

        } catch (error) {
            console.error("Erreur lors de l'ajout de liquidité :", error);

        } finally {
            setLoading(false);
        }
    };

    const removeLiquidity = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!liquidityAmount) return alert("Veuillez entrer un montant valide");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, LPPairAddress, LPPairAbi, "removeLiquidity", [liquidityAmount.toString()]);

            setLiquidityAmount(0n);
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
            await executeSmartContract(provider, LPPairAddress, LPPairAbi, "swap", [swapToken, swapAmount]);

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

                    <p><strong>{reserves.tokenA} :</strong> {divideBigInt(balances.balanceA, 10n ** BigInt(decimalsA ?? 0)).toFixed(decimalsA ?? 0)} | Allowance : {divideBigInt(allowances.allowanceA, 10n ** BigInt(decimalsA ?? 0)).toFixed(decimalsA ?? 0)}</p>
                    <p><strong>{reserves.tokenB} :</strong> {divideBigInt(balances.balanceB, 10n ** BigInt(decimalsB ?? 0)).toFixed(decimalsB ?? 0)} | Allowance : {divideBigInt(allowances.allowanceB, 10n ** BigInt(decimalsB ?? 0)).toFixed(decimalsB ?? 0)}</p>

                    <button className="btn btn-outline-secondary btn-sm mb-2" onClick={fetchBalancesAndAllowances} disabled={!walletAddress}>
                        🔄 Rafraîchir
                    </button>

                    {/* Approve Tokens */}
                    <div className="d-flex gap-2">
                        <input
                            className="form-control"
                            placeholder="Approve Token A"
                            value={approveAmountA.toString()}
                            onChange={(e) => setApproveAmountA(BigInt(e.target.value))}
                        />
                        <button className="btn btn-primary" onClick={() => approveToken(reserves.tokenA, approveAmountA)} disabled={loading || !walletAddress}>
                            ✅ Approuver
                        </button>
                    </div>

                    <div className="d-flex gap-2 mt-2">
                        <input
                            className="form-control"
                            placeholder="Approve Token B"
                            value={approveAmountB.toString()}
                            onChange={(e) => setApproveAmountB(BigInt(e.target.value))}
                        />
                        <button className="btn btn-primary" onClick={() => approveToken(reserves.tokenB, approveAmountB)} disabled={loading || !walletAddress}>
                            ✅ Approuver
                        </button>
                    </div>
                </div>
            )}

            <div className="d-flex mb-3">
                {/* Ajouter de la liquidité */}
                <div className="card p-3 mb-3 flex-grow-1 me-3">
                    <h5>➕ Ajouter de la liquidité</h5>
                    <input
                        type="number"
                        className="form-control mb-2"
                        placeholder="Montant Token A"
                        value={amountA.toString()}
                        onChange={(e) => setAmountA(BigInt(e.target.value))}
                    />
                    <input
                        type="number"
                        className="form-control mb-2"
                        placeholder="Montant Token B"
                        value={amountB.toString()}
                        onChange={(e) => setAmountB(BigInt(e.target.value))}
                    />
                    <button className="btn btn-success w-100" onClick={addLiquidity} disabled={loading || !walletAddress}>
                        {loading ? "⏳ Ajout..." : "➕ Ajouter"}
                    </button>
                </div>

                {/* Retirer de la liquidité */}
                <div className="card p-3 mb-3 flex-grow-1 ms-3">
                    <h5>➖ Retirer de la liquidité</h5>
                    <input
                        type="number"
                        className="form-control mb-2"
                        placeholder="Montant de liquidité"
                        value={liquidityAmount.toString()}
                        onChange={(e) => setLiquidityAmount(BigInt(e.target.value))}
                    />
                    <button className="btn btn-danger w-100" onClick={removeLiquidity} disabled={loading || !walletAddress}>
                        {loading ? "⏳ Retrait..." : "➖ Retirer"}
                    </button>
                </div>
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
                    type="number"
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
