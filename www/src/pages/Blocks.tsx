// Blocks.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import { BlockHash } from "@backend/types/block.types";


const Blocks: React.FC = () => {
    const [blocks, setBlocks] = useState<{ blockHeight: number; hash: BlockHash;  }[]>([]);

    useEffect(() => {
        const fetchBlocks = async () => {
            try {
                const response = await axios.get<Array<BlockHash>>("/api/blocks"); // Assurez-vous que ce endpoint existe côté backend
                setBlocks(response.data.map((hash, blockHeight) => ({blockHeight, hash})));

            } catch (error) {
                console.error("Erreur lors de la récupération des blocs :", error);
            }
        };

        fetchBlocks();
    }, []);

    return (
        <div className="container mt-4">
            <h2>Liste des derniers blocs</h2>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Numéro</th>
                        <th>Hash</th>
                    </tr>
                </thead>
                <tbody>
                    {blocks.map((block) => (
                        <tr key={block.hash}>
                            <td>
                                <a href={`#/blocks/${block.blockHeight}`}>{block.blockHeight}</a>
                            </td>
                            <td>
                                <a href={`#/blocks/${block.blockHeight}`}>{block.hash}</a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default Blocks;
