// Block.tsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { jsonReviver } from "../utils/jsonUtils";
import { getUsDateTime } from "../utils/dateUtils";

import type { BlockData } from "@backend/types/block.types";


const ITEMS_PER_PAGE = 10; // Nombre de transactions par page


const Block: React.FC = () => {
    const { blockHeight } = useParams<{ blockHeight: string }>();
    const [block, setBlock] = useState<BlockData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);


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


    // Pagination
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentTransactions = block.transactions.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(block.transactions.length / ITEMS_PER_PAGE);


    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };


    return (
        <div className="container mt-4">
            <h2>Bloc #{block.blockHeight}</h2>

            <p><strong>Hash :</strong> {block.hash}</p>
            <p><strong>Miner :</strong> <a href={`#/accounts/${block.miner}`}>{block.miner}</a></p>
            <p><strong>Nonce :</strong> {block.nonce.toString()}</p>
            <p><strong>Timestamp :</strong> {getUsDateTime(new Date(block.timestamp))}</p>
            <p><strong>Transactions :</strong></p>
            <ul>
                {currentTransactions.map(txHash => (
                    <li key={txHash}>
                        <a href={`#/transactions/${txHash}`}>{txHash}</a>
                    </li>
                ))}
            </ul>

            {/* Pagination */}
            <nav>
                <ul className="pagination">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Précédent</button>
                    </li>
                    {[...Array(totalPages)].map((_, index) => (
                        <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => handlePageChange(index + 1)}>{index + 1}</button>
                        </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Suivant</button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};


export default Block;
