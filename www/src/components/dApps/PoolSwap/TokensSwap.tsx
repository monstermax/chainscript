// TokensSwap.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { AMMRouterAddress, swapableTokens } from "../../../config.client";
import { jsonReplacer, jsonReviver } from "../../../utils/jsonUtils";
import { divideBigInt } from "../../../utils/numberUtils";
import { AMMRouterAbi } from "../../../abi/AMMRouterAbi";
import { TokenAbi } from "../../../abi/TokenAbi";
import { callSmartContract, executeSmartContract } from "../../../utils/contractUtils";

import ConnectWallet from "../../Web3/ConnectWallet";
import TokenSelectorModal from "./TokenSelectorModal";

import type { AccountAddress } from "@backend/types/account.types";


const TokensSwap: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<AccountAddress | null>(null);
    const [tokenIn, setTokenIn] = useState<AccountAddress | null>(null);
    const [tokenOut, setTokenOut] = useState<AccountAddress | null>(null);
    const [amountIn, setAmountIn] = useState<bigint>(0n);
    const [amountOut, setAmountOut] = useState<bigint | null>(null);
    const [swapRate, setSwapRate] = useState<string | null>(null);
    const [balances, setBalances] = useState<{ [token: AccountAddress]: bigint }>({});
    const [loading, setLoading] = useState(false);
    const [showTokenInModal, setShowTokenInModal] = useState(false);
    const [showTokenOutModal, setShowTokenOutModal] = useState(false);

    useEffect(() => {
        fetchBalances();
    }, [walletAddress, tokenIn, tokenOut]);

    useEffect(() => {
        fetchSwapRate();
    }, [amountIn, tokenIn, tokenOut]);

    const fetchBalances = async () => {
        if (!walletAddress || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const newBalances: { [token: string]: bigint } = {};

            for (const token of Object.keys(swapableTokens)) {
                const balance = await callSmartContract(provider, token as AccountAddress, TokenAbi, "balanceOf", [walletAddress]);
                newBalances[token as AccountAddress] = BigInt(balance);
            }

            setBalances(newBalances);
        } catch (error) {
            console.error("Erreur lors de la récupération des balances :", error);
        }
    };

    const fetchSwapRate = async () => {
        if (!walletAddress || !window.ethereum || !tokenIn || !tokenOut || amountIn <= 0n) {
            setSwapRate(null);
            setAmountOut(0n);
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            console.log(`Fetching swap rate for path: [${tokenIn}, ${tokenOut}] with amountIn: ${amountIn}`);

            const result = await callSmartContract(provider, AMMRouterAddress, AMMRouterAbi, "getAmountsOut", [
                amountIn.toString(),
                JSON.stringify([tokenIn, tokenOut], jsonReplacer)
            ]);

            console.log("Raw result from getAmountsOut:", result);

            if (result) {
                const amounts: bigint[] = JSON.parse(result, jsonReviver); // jsonReviver pour gérer les BigInt
                console.log("Parsed amounts:", amounts);

                if (amounts.length >= 2) {
                    const estimatedAmountOut: bigint = amounts[1];
                    setAmountOut(estimatedAmountOut);

                    // Calcul du taux de conversion (directement en BigInt)
                    const rate = estimatedAmountOut * 10n ** 18n / amountIn;
                    setSwapRate(`1 ${swapableTokens[tokenIn]} ≈ ${rate.toString()} ${swapableTokens[tokenOut]}`);

                } else {
                    console.warn("getAmountsOut returned unexpected data:", amounts);
                    setAmountOut(0n);
                    setSwapRate(null);
                }

            } else {
                setAmountOut(0n);
                setSwapRate(null);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération du taux de swap :", error);
            setAmountOut(0n);
            setSwapRate(null);
        }
    };


    const swapTokens = async () => {
        if (!walletAddress || !window.ethereum || !tokenIn || !tokenOut || !amountIn) return;
        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await executeSmartContract(provider, AMMRouterAddress, AMMRouterAbi, "swap", [tokenIn, tokenOut, amountIn.toString()]);
            fetchBalances();

        } catch (error) {
            console.error("Erreur lors du swap de tokens :", error);
        } finally {
            setLoading(false);
        }
    };

    const useMaxBalance = () => {
        if (tokenIn && balances[tokenIn]) {
            setAmountIn(balances[tokenIn]);
        }
    };

    const switchTokens = () => {
        setTokenIn(tokenOut);
        setTokenOut(tokenIn);
        setAmountIn(0n);
        setAmountOut(0n);
        setSwapRate(null);
    };

    return (
        <div className="container mt-4 d-flex justify-content-center">
            <div className="card p-4 shadow-lg rounded-lg" style={{ maxWidth: "450px", background: "#1e1e2f", color: "#fff" }}>
                <h4 className="mb-3 text-center">🔄 Token Swap</h4>

                <ConnectWallet onConnect={setWalletAddress} />

                {/* Zone Token In */}
                <div className="card p-3 mb-3" style={{ background: "#282845" }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <button className="btn btn-outline-light" onClick={() => setShowTokenInModal(true)}>
                            {tokenIn ? swapableTokens[tokenIn] : "Sélectionner un token"}
                        </button>
                        <span className="text-light" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                            {tokenIn && balances[tokenIn] ? ethers.formatUnits(balances[tokenIn], 18) : "0.00"}
                        </span>
                    </div>

                    <TokenSelectorModal
                        show={showTokenInModal}
                        onClose={() => setShowTokenInModal(false)}
                        onSelect={(token) => setTokenIn(token as AccountAddress)}
                        walletAddress={walletAddress}
                    />

                    <div className="input-group mt-2">
                        <input
                            type="number"
                            className="form-control"
                            placeholder="Montant à échanger"
                            value={amountIn.toString()}
                            onChange={(e) => setAmountIn(BigInt(e.target.value))}
                        />
                        <button className="btn btn-secondary" onClick={useMaxBalance}>Max</button>
                    </div>
                </div>

                {/* Bouton Switch Tokens */}
                <div className="d-flex justify-content-center mb-3">
                    <button className="btn btn-light rounded-circle p-2" onClick={switchTokens}>🔄</button>
                </div>

                {/* Zone Token Out */}
                <div className="card p-3 mb-3" style={{ background: "#282845" }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <button className="btn btn-outline-light" onClick={() => setShowTokenOutModal(true)}>
                            {tokenOut ? swapableTokens[tokenOut] : "Sélectionner un token"}
                        </button>
                        <span className="text-light" style={{ fontSize: "0.85rem", opacity: 0.8 }}>0.00</span>
                    </div>

                    <TokenSelectorModal
                        show={showTokenOutModal}
                        onClose={() => setShowTokenOutModal(false)}
                        onSelect={(token) => setTokenOut(token as AccountAddress)}
                        walletAddress={walletAddress}
                    />

                    <div className="input-group mt-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Montant reçu (estimé)"
                            value={amountOut?.toString() ?? ''}
                            readOnly
                        />
                    </div>
                </div>

                {/* Prix estimé du swap */}
                {swapRate && (
                    <p className="text-light text-center mt-2" style={{ opacity: 0.8 }}>
                        {swapRate}
                    </p>
                )}

                {/* Bouton Swap */}
                <button className="btn btn-primary w-100 py-2" onClick={swapTokens} disabled={loading || !walletAddress}>
                    {loading ? "⏳ Swap en cours..." : "🔄 Swap"}
                </button>
            </div>
        </div>
    );
};


export default TokensSwap;
