// Blocks.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";

import type { BlockHash } from "@backend/types/block.types";


const ITEMS_PER_PAGE = 10; // Nombre de blocs par page


const Blocks: React.FC = () => {
    const [blocks, setBlocks] = useState<{ blockHeight: number; hash: BlockHash; }[]>([]);
    const [currentPage, setCurrentPage] = useState(1);


    useEffect(() => {
        const fetchBlocks = async () => {
            try {
                const response = await axios.get<Array<BlockHash>>("/api/blocks"); // Assurez-vous que ce endpoint existe côté backend

                const blocks = response.data
                    .map((hash, blockHeight) => ({ blockHeight, hash }))
                    .reverse();

                setBlocks(blocks);

            } catch (error) {
                console.error("Erreur lors de la récupération des blocs :", error);
            }
        };

        fetchBlocks();
    }, []);


    // Pagination
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentBlocks = blocks.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(blocks.length / ITEMS_PER_PAGE);


    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };


    const isPagePaginationVisible = (page: number) => {
        const diff = Math.abs(currentPage - page);
        if (diff > 4 && page > 3 && page < totalPages - 2) return false;
        return true;
    }


    return (
        <div className="container mt-4">
            <h2>Liste des derniers blocs</h2>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Numéro</th>
                        <th>Hash</th>
                    </tr>
                </thead>
                <tbody>
                    {currentBlocks.map((block, index) => (
                        <tr key={block.hash}>
                            <td>{index+1}</td>
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

            {/* Pagination */}
            <nav>
                <ul className="pagination">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Précédent</button>
                    </li>

                    {[...Array(totalPages)].map((_, index) => {
                        const page = (index + 1);
                        if (!isPagePaginationVisible(page)) return null;
                        const prevPageHidden = page > 1 && !isPagePaginationVisible(page - 1);

                        return (
                            <React.Fragment key={index}>
                                {prevPageHidden && <li className="page-item disabled"><span className="page-link">...</span></li>}
                                <li className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(page)}>{page}</button>
                                </li>
                            </React.Fragment>
                        );
                    })}

                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Suivant</button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};


export default Blocks;

