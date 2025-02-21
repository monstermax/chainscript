// Layout.tsx

import React, { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useWeb3 } from "./components/Web3Provider";



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
                        <li className="nav-item">
                            <Link className="nav-link" to="/dapps">💻 dApps</Link>
                        </li>
                    </ul>


                    {/* ConnectWallet intégré dans le header */}
                    <ConnectWallet />

                </div>
            </nav>

            <div className="container mt-4">
                {children}
            </div>
        </>
    );
};

const ConnectWallet: React.FC = () => {
    const { walletAddress, connectWallet, copyAddressToClipboard } = useWeb3();

    return (
        <div className="d-flex align-items-center mb-3">
            {walletAddress ? (
                <div className="d-flex align-items-center">
                    <span className="badge bg-success p-2 me-2">✅ Connecté: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>

                    <button className="btn btn-outline-secondary btn-sm" onClick={copyAddressToClipboard} title="Copier l'adresse">
                        📋
                    </button>
                </div>
            ) : (
                <button className="btn btn-primary" onClick={() => connectWallet(true)}>
                    🔌 Connecter le wallet
                </button>
            )}
        </div>
    );
};


export default Layout;
