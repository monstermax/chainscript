// Accounts.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import type { HexNumber } from "@backend/types/types";
import type { AccountAddress } from "@backend/types/account.types";


const ITEMS_PER_PAGE = 10; // Nombre de comptes par page


const Accounts: React.FC = () => {
    const [accounts, setAccounts] = useState<{ accountAddress: string; blockHeight: number }[]>([]);
    const [currentPage, setCurrentPage] = useState(1);


    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const response = await axios.get<Map<AccountAddress, HexNumber>>("/api/accounts");
                const accounts = Object.entries(response.data).map(([accountAddress, blockHeight]) => ({ accountAddress, blockHeight }));
                setAccounts(accounts);

            } catch (error) {
                console.error("Erreur lors de la récupération des comptes :", error);
            }
        };

        fetchAccounts();
    }, []);


    // Pagination
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentAccounts = accounts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(accounts.length / ITEMS_PER_PAGE);


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
            <h2>Liste des Comptes</h2>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Adresse</th>
                    </tr>
                </thead>
                <tbody>
                    {currentAccounts.map((account, index) => (
                        <tr key={account.accountAddress}>
                            <td>{index+1}</td>
                            <td>
                                <a href={`#/accounts/${account.accountAddress}`}>{account.accountAddress}</a>
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

export default Accounts;
