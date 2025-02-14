// App.tsx

import React, { ReactNode } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { MetaMaskInpageProvider } from "@metamask/providers";

// Pages
import Home from "./pages/Home";
import Blocks from "./pages/Blocks";
import Transactions from "./pages/Transactions";
import Web3 from "./pages/Web3";
import Accounts from "./pages/Accounts";
import Layout from "./Layout";
import Block from "./pages/Block";
import Transaction from "./pages/Transaction";
import Account from "./pages/Account";



declare global {
    interface Window {
        ethereum?: MetaMaskInpageProvider;
    }
}


type LayoutProps = {
    children?: ReactNode;
}


// Layout
const LayoutOLD: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div>
            <nav style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
                <Link to="/">Home</Link> | 
                <Link to="/blocks"> Blocks</Link> | 
                <Link to="/transactions"> Transactions</Link> | 
                <Link to="/accounts"> Accounts</Link> | 
                <Link to="/web3"> Web3</Link>
            </nav>
            <div style={{ padding: "20px" }}>{children}</div>
        </div>
    );
};


const App = () => {
    return (
        <HashRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/blocks" element={<Blocks />} />
                    <Route path="/blocks/:blockHeight" element={<Block />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/transactions/:txHash" element={<Transaction />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/accounts/:accountAddress" element={<Account />} />
                    <Route path="/web3" element={<Web3 />} />
                </Routes>
            </Layout>
        </HashRouter>
    );
};

export default App;
