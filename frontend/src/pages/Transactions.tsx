// Transactions.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";

import { TransactionHash } from "@backend/types/transaction.types";


const ITEMS_PER_PAGE = 10; // Nombre de transactions par page


const Transactions: React.FC = () => {
    const [transactions, setTransactions] = useState<{ txHash: TransactionHash; blockHeight: number }[]>([]);
    const [currentPage, setCurrentPage] = useState(1);


    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await axios.get<Map<TransactionHash, number>>("/api/transactions");

                const transactions = Object.entries(response.data)
                    .map(([txHash, blockHeight]) => ({ txHash: txHash as TransactionHash, blockHeight }))
                    .reverse();

                setTransactions(transactions);

            } catch (error) {
                console.error("Erreur lors de la récupération des transactions :", error);
            }
        };

        fetchTransactions();
    }, []);


    // Pagination
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);


    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const isPagePaginationVisible = (page: number) => {
        const diff = Math.abs(currentPage - page);
        if (diff > 4 && page > 3 && page < totalPages - 2) return false;
        return true;
    };


    return (
        <div className="container mt-4">
            <h2>Liste des dernières transactions</h2>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Hash</th>
                        <th>Block</th>
                    </tr>
                </thead>
                <tbody>
                    {currentTransactions.map((tx, index) => (
                        <tr key={tx.txHash}>
                            <td>{index+1}</td>
                            <td>
                                <a href={`#/transactions/${tx.txHash}`}>{tx.txHash}</a>
                            </td>
                            <td>
                                <a href={`#/blocks/${tx.blockHeight}`}>{tx.blockHeight}</a>
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


export default Transactions;
