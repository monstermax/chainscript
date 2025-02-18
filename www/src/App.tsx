// App.tsx

import React, { ReactNode } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { MetaMaskInpageProvider } from "@metamask/providers";


// Layout
import Layout from "./Layout";

// Pages
import Home from "./pages/Home";
import Blocks from "./pages/Blocks";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import Block from "./pages/Block";
import Transaction from "./pages/Transaction";
import Account from "./pages/Account";
import Web3 from "./pages/Web3";
import Dapps from "./pages/Dapps";

// dApps
import ChainTweet from "./components/dApps/ChainTweet/ChainTweet";
import ChainChat from "./components/dApps/ChainChat/ChainChat";
import LPPair from "./components/dApps/PoolSwap/LPPair";
import AMMRouter from "./components/dApps/PoolSwap/AMMRouter";
import ChainIt from "./components/dApps/ChainIt/ChainIt";
import TokensSwap from "./components/dApps/PoolSwap/TokensSwap";
import PoolLiquidity from "./components/dApps/PoolSwap/PoolLiquidity";
import ChainStore from "./components/dApps/ChainStore/ChainStore";
import TeleScript from "./components/dApps/TeleScript/TeleScript";




declare global {
    interface Window {
        ethereum?: MetaMaskInpageProvider;
    }
}



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
                    <Route path="/dapps" element={<Dapps />} />
                    <Route path="/dapps/chaintweet" element={<ChainTweet />} />
                    <Route path="/dapps/chainchat" element={<ChainChat />} />
                    <Route path="/dapps/chainstore" element={<ChainStore />} />
                    <Route path="/dapps/lppair" element={<LPPair />} />
                    <Route path="/dapps/lprouter" element={<AMMRouter />} />
                    <Route path="/dapps/chainit" element={<ChainIt />} />
                    <Route path="/dapps/swap" element={<TokensSwap />} />
                    <Route path="/dapps/liquidity" element={<PoolLiquidity />} />
                    <Route path="/dapps/telescript" element={<TeleScript />} />
                </Routes>
            </Layout>
        </HashRouter>
    );
};

export default App;
