// ChainIt.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractsAddresses } from "@frontend/config.client";
import { ChainItAbi } from "@frontend/abi/ChainItAbi";
import { callSmartContract, executeSmartContract } from "@frontend/utils/contractUtils";

import { useWeb3 } from "@frontend/components/Web3Provider";


import type { AccountAddress } from "@backend/types/account.types";


const ChainItAddress = contractsAddresses.dApps.ChainIt as AccountAddress;


const ChainIt: React.FC = () => {
    const { walletAddress } = useWeb3();
    const [posts, setPosts] = useState<{ id: string; author: AccountAddress; title: string; content: string; timestamp: number; comments: { author: AccountAddress; comment: string; timestamp: number }[] }[]>([]);
    const [title, setTitle] = useState<string>("");
    const [content, setContent] = useState<string>("");
    const [comment, setComment] = useState<{ [postId: string]: string }>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, [walletAddress]);

    const fetchPosts = async () => {
        if (!walletAddress || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const result = await callSmartContract(provider, ChainItAddress, ChainItAbi, "getLastPosts", ["100", "0"]);

            setPosts(JSON.parse(result));

        } catch (error) {
            console.error("Erreur lors du chargement des posts :", error);
        }
    };

    const postThread = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!title.trim() || !content.trim()) return alert("Veuillez remplir tous les champs");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            await executeSmartContract(provider, ChainItAddress, ChainItAbi, "postThread", [title, content]);

            setTitle("");
            setContent("");
            fetchPosts();

        } catch (error) {
            console.error("Erreur lors de la publication du post :", error);
        } finally {
            setLoading(false);
        }
    };

    const commentThread = async (postId: string) => {
        if (!walletAddress || !window.ethereum) return;
        if (!comment[postId]?.trim()) return alert("Le commentaire est vide !");

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            await executeSmartContract(provider, ChainItAddress, ChainItAbi, "commentThread", [postId, comment[postId]]);

            setComment({ ...comment, [postId]: "" });
            fetchPosts();

        } catch (error) {
            console.error("Erreur lors de l'ajout du commentaire :", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-3">📌 ChainIt - Forum Décentralisé</h2>

            {/* Création d'un post */}
            <div className="card p-3 mb-3">
                <h5>📝 Créer un post</h5>

                <input
                    className="form-control mb-2"
                    placeholder="Titre du post"
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <textarea
                    className="form-control mb-2"
                    placeholder="Contenu du post"
                    maxLength={1000}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                ></textarea>

                <button className="btn btn-primary w-100" onClick={postThread} disabled={loading || !walletAddress}>
                    {loading ? "⏳ Publication..." : "📢 Publier"}
                </button>
            </div>

            {/* Liste des derniers posts */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h4 className="mb-0">📜 Derniers Posts</h4>

                <button className="btn btn-outline-secondary btn-sm" onClick={fetchPosts} disabled={!walletAddress} title="Rafraîchir">
                    🔄
                </button>
            </div>

            <ul className="list-group">
                {posts.map((post) => (
                    <li key={post.id} className="list-group-item">
                        <h5>{post.title}</h5>
                        <p>{post.content}</p>
                        <small className="text-muted">Posté par <strong>{post.author}</strong> le {new Date(Number(post.timestamp)).toLocaleString()}</small>

                        {/* Ajout de commentaire */}
                        <div className="mt-3">
                            <input
                                className="form-control mb-2"
                                placeholder="Ajouter un commentaire..."
                                value={comment[post.id] || ""}
                                onChange={(e) => setComment({ ...comment, [post.id]: e.target.value })}
                            />
                            <button className="btn btn-sm btn-success" onClick={() => commentThread(post.id)} disabled={loading || !walletAddress}>
                                {loading ? "⏳ Ajout..." : "💬 Commenter"}
                            </button>
                        </div>

                        {/* Liste des commentaires */}
                        {post.comments.length > 0 && (
                            <ul className="list-group mt-3">
                                {post.comments.map((c, idx) => (
                                    <li key={idx} className="list-group-item">
                                        <strong>{c.author}</strong>: {c.comment}
                                        <small className="text-muted d-block">{new Date(Number(c.timestamp)).toLocaleString()}</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};


export default ChainIt;
