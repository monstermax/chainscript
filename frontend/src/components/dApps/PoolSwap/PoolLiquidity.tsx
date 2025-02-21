// PoolLiquidity.tsx


import React, { useEffect, useState } from "react";
import { ethers } from "ethers";


import { contractsAddresses, swapableTokens } from "@frontend/config.client";
import { callSmartContract, executeSmartContract } from "@frontend/utils/contractUtils";
import { TokenAbi } from "@frontend/abi/TokenAbi";
import { LPPairAbi } from "@frontend/abi/LPPairAbi";

import { useWeb3 } from "@frontend/components/Web3Provider";
import TokenSelectorModal from "./TokenSelectorModal";

import type { AccountAddress } from "@backend/types/account.types";


const LPPairAddress = contractsAddresses.LpPairs.WDEV_ChainCoin as AccountAddress;


const PoolLiquidity: React.FC = () => {
    const { walletAddress } = useWeb3();
    const [tokenA, setTokenA] = useState<AccountAddress | null>(null);
    const [tokenB, setTokenB] = useState<AccountAddress | null>(null);
    const [amountA, setAmountA] = useState<bigint>(0n);
    const [amountB, setAmountB] = useState<bigint>(0n);
    const [liquidityAmount, setLiquidityAmount] = useState<bigint>(0n);
    const [balances, setBalances] = useState<{ [token: AccountAddress]: bigint }>({});
    const [reserves, setReserves] = useState<{ tokenA: string; tokenB: string; reservesA: bigint; reservesB: bigint; totalLiquidity: bigint } | null>(null);
    const [loading, setLoading] = useState(false);
    const [showTokenAModal, setShowTokenAModal] = useState(false);
    const [showTokenBModal, setShowTokenBModal] = useState(false);

    useEffect(() => {
        fetchBalancesAndReserves();
    }, [walletAddress, tokenA, tokenB]);

    const fetchBalancesAndReserves = async () => {
        if (!walletAddress || !tokenA || !tokenB || !window.ethereum) return;
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const newBalances: { [token: string]: bigint } = {};

            for (const token of [tokenA, tokenB]) {
                const balance = await callSmartContract(provider, token as AccountAddress, TokenAbi, "balanceOf", [walletAddress]);
                newBalances[token as AccountAddress] = BigInt(balance);
            }
            setBalances(newBalances);

            const result = await callSmartContract(provider, LPPairAddress, LPPairAbi, "getReserves", []);
            setReserves(JSON.parse(result));

        } catch (error) {
            console.error("Erreur lors de la récupération des données :", error);
        }
    };

    const addLiquidity = async () => {
        if (!window.ethereum) return alert("Wallet non connecté");
        if (!walletAddress || !tokenA || !tokenB || amountA <= 0n || amountB <= 0n) return;

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, LPPairAddress, LPPairAbi, "addLiquidity", [amountA.toString(), amountB.toString()]);
            fetchBalancesAndReserves();

        } catch (error) {
            console.error("Erreur lors de l'ajout de liquidité :", error);

        } finally {
            setLoading(false);
        }
    };

    const removeLiquidity = async () => {
        if (!window.ethereum) return alert("Wallet non connecté");
        if (!walletAddress || !liquidityAmount) return;

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, LPPairAddress, LPPairAbi, "removeLiquidity", [liquidityAmount.toString()]);
            fetchBalancesAndReserves();

        } catch (error) {
            console.error("Erreur lors du retrait de liquidité :", error);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4 d-flex justify-content-center">
            <div className="card p-4 shadow-lg rounded-lg" style={{ maxWidth: "450px", background: "#1e1e2f", color: "#fff" }}>
                <h4 className="mb-3 text-center">💧 Pool Liquidity</h4>

                {/* Sélection des Tokens */}
                <button className="btn btn-outline-light mb-2" onClick={() => setShowTokenAModal(true)}>
                    {tokenA ? swapableTokens[tokenA] : "Sélectionner Token A"}
                </button>

                <TokenSelectorModal
                    show={showTokenAModal}
                    onClose={() => setShowTokenAModal(false)}
                    onSelect={(value) => setTokenA(value as AccountAddress)}
                    walletAddress={walletAddress} />

                <button className="btn btn-outline-light mb-3" onClick={() => setShowTokenBModal(true)}>
                    {tokenB ? swapableTokens[tokenB] : "Sélectionner Token B"}
                </button>

                <TokenSelectorModal
                    show={showTokenBModal}
                    onClose={() => setShowTokenBModal(false)}
                    onSelect={(value) => setTokenB(value as AccountAddress)}
                    walletAddress={walletAddress} />


                {/* Ajout de liquidité */}
                <div className="input-group mb-2">
                    <input type="number"
                        className="form-control"
                        placeholder="Montant Token A"
                        value={amountA.toString()}
                        onChange={(e) => setAmountA(BigInt(e.target.value))} 
                        />
                    <span className="input-group-text">Montant A</span>
                </div>

                <div className="input-group mb-2">
                    <input type="number"
                        className="form-control"
                        placeholder="Montant Token B"
                        value={amountB.toString()}
                        onChange={(e) => setAmountB(BigInt(e.target.value))} 
                        />
                    <span className="input-group-text">Montant B</span>
                </div>

                <button
                    className="btn btn-success w-100 mb-3"
                    onClick={addLiquidity}
                    disabled={loading || !walletAddress}
                    >
                    {loading ? "⏳ Ajout..." : "➕ Ajouter"}
                </button>


                {/* Retrait de liquidité */}

                <div className="input-group mb-2">
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Montant de liquidité"
                        value={liquidityAmount.toString()}
                        onChange={(e) => setLiquidityAmount(BigInt(e.target.value))} 
                        />
                    <span className="input-group-text">Montant</span>
                </div>

                <button
                    className="btn btn-danger w-100"
                    onClick={removeLiquidity}
                    disabled={loading || !walletAddress}
                    >
                    {loading ? "⏳ Retrait..." : "➖ Retirer"}
                </button>
            </div>
        </div>
    );
};


export default PoolLiquidity;
