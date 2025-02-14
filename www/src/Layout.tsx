// Layout.tsx

import React, { ReactNode } from "react";
import { Link, Outlet } from "react-router-dom";



type LayoutProps = {
    children?: ReactNode;
}


const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <>
            <nav className="navbar navbar-expand-lg navbar-light bg-light">
                <div className="container">
                    <Link className="navbar-brand" to="/">ChainScript</Link>
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <Link className="nav-link" to="/">🏠 Home</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/blocks">📜 Blocks</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/transactions">💳 Transactions</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/accounts">💼 Accounts</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/web3">🌐 Web3</Link>
                        </li>
                    </ul>
                </div>
            </nav>
            <div className="container mt-4">
                {children}
            </div>
        </>
    );
};


export default Layout;
