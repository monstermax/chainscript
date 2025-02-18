// ChainTweet.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractsAddresses } from "@frontend/config.client";
import { ChainTweetAbi } from "@frontend/abi/ChainTweetAbi";

import { callSmartContract, executeSmartContract } from "@frontend/utils/contractUtils";
import ConnectWallet from "@frontend/components/Web3/ConnectWallet";

import type { AccountAddress } from "@backend/types/account.types";


const ChainTweetAddress = contractsAddresses.dApps.ChainTweet as AccountAddress;


const ChainTweet: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<AccountAddress | null>(null);
    const [tweets, setTweets] = useState<{ sender: AccountAddress; content: string; timestamp: number }[]>([]);
    const [tweetContent, setTweetContent] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTweets();
    }, [walletAddress]);


    const fetchTweets = async () => {
        if (!walletAddress) return; // alert("Connecte ton wallet !");
        if (!window.ethereum) return; // alert("Wallet non connecté");

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);

            const result = await callSmartContract(provider, ChainTweetAddress, ChainTweetAbi, "getLastTweets", ["100", "0"]);
            //console.log('result:', result);

            setTweets(JSON.parse(result));

        } catch (error) {
            console.error("Erreur lors du chargement des tweets :", error);
        }
    };

    const postTweet = async () => {
        if (!walletAddress) return; // alert("Connecte ton wallet !");
        if (!window.ethereum) return; // alert("Wallet non connecté");
        if (!tweetContent.trim()) return alert("Le tweet est vide !");
        if (tweetContent.length > 280) return alert("Le tweet est trop long !");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            await executeSmartContract(provider, ChainTweetAddress, ChainTweetAbi, "postTweet", [tweetContent]);

            setTweetContent("");
            fetchTweets();

        } catch (error) {
            console.error("Erreur lors de la publication du tweet :", error);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-3">📝 ChainTweet</h2>

            <ConnectWallet onConnect={setWalletAddress} />

            <div className="card p-3 mb-3">
                <textarea
                    className="form-control mb-2"
                    placeholder="Exprime-toi en 280 caractères..."
                    maxLength={280}
                    value={tweetContent}
                    onChange={(e) => setTweetContent(e.target.value)}
                ></textarea>

                <button className="btn btn-primary w-100" onClick={postTweet} disabled={loading || !walletAddress}>
                    {loading ? "⏳ Publication..." : "📢 Publier"}
                </button>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-3">
                <h4 className="mb-0">📜 Derniers Tweets</h4>

                <button className="btn btn-outline-secondary btn-sm" onClick={fetchTweets} disabled={!walletAddress} title="Rafraîchir">
                    🔄
                </button>
            </div>


            <ul className="list-group">
                {tweets.map((tweet, index) => (
                    <li key={index} className="list-group-item">
                        <strong>{tweet.sender}</strong>: {tweet.content}
                        <span className="text-muted d-block">{new Date(Number(tweet.timestamp)).toLocaleString()}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};


export default ChainTweet;
