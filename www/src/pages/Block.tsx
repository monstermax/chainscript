// Block.tsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { jsonReviver } from "../utils/jsonUtils";

import type { BlockData } from "@backend/types/block.types";



const Block: React.FC = () => {
    const { blockHeight } = useParams<{ blockHeight: string }>();
    const [block, setBlock] = useState<BlockData | null>(null);

    useEffect(() => {
        const fetchBlock = async () => {
            try {
                const response = await fetch(`/api/blocks/${blockHeight}`);
                const json = await response.text();
                const block = JSON.parse(json, jsonReviver) as BlockData;
                setBlock(block);

            } catch (error) {
                console.error("Erreur lors de la récupération du bloc :", error);
            }
        };

        fetchBlock();
    }, [blockHeight]);

    if (!block) return <p>Chargement du bloc...</p>;

    return (
        <div className="container mt-4">
            <h2>Bloc #{block.blockHeight}</h2>
            <p><strong>Hash :</strong> {block.hash}</p>
            <p><strong>Miner :</strong> {block.miner}</p>
            <p><strong>Nonce :</strong> {block.nonce}</p>
            <p><strong>Timestamp :</strong> {new Date(block.timestamp * 1000).toLocaleString()}</p>
            <p><strong>Transactions :</strong></p>
            <ul>
                {block.transactions.map(tx => (
                    <li key={tx.hash}>
                        <a href={`#/transactions/${tx.hash}`}>{tx.hash}</a>
                    </li>
                ))}
            </ul>
        </div>
    );
};


export default Block;
