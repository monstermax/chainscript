// Dapps.tsx

import React from "react";


const Dapps: React.FC = () => {
    return (
        <div className="container mt-4">
            <h2 className="mb-4 text-center">🌐 Applications Décentralisées</h2>

            <div className="row g-3">
                {/* ChainTweet */}
                <div className="col-md-4">
                    <a href="#/dapps/chaintweet" className="text-decoration-none">
                        <div className="card shadow-sm dapp-card">
                            <div className="card-body text-center">
                                <h5 className="card-title">📢 ChainTweet</h5>
                                <p className="card-text">Exprime-toi sur la blockchain.</p>
                            </div>
                        </div>
                    </a>
                </div>

                {/* ChainChat */}
                <div className="col-md-4">
                    <a href="#/dapps/chainchat" className="text-decoration-none">
                        <div className="card shadow-sm dapp-card">
                            <div className="card-body text-center">
                                <h5 className="card-title">💬 ChainChat</h5>
                                <p className="card-text">Messagerie privée et sécurisée.</p>
                            </div>
                        </div>
                    </a>
                </div>

                {/* ChainIt */}
                <div className="col-md-4">
                    <a href="#/dapps/chainit" className="text-decoration-none">
                        <div className="card shadow-sm dapp-card">
                            <div className="card-body text-center">
                                <h5 className="card-title">📌 ChainIt</h5>
                                <p className="card-text">Partagez et discutez sur un forum décentralisé.</p>
                            </div>
                        </div>
                    </a>
                </div>

                {/* Liquidity Pair */}
                <div className="col-md-4">
                    <a href="#/dapps/lppair" className="text-decoration-none">
                        <div className="card shadow-sm dapp-card">
                            <div className="card-body text-center">
                                <h5 className="card-title">💧 Liquidity Pair</h5>
                                <p className="card-text">Ajoutez ou retirez de la liquidité.</p>
                            </div>
                        </div>
                    </a>
                </div>

                {/* AMM Router */}
                <div className="col-md-4">
                    <a href="#/dapps/lprouter" className="text-decoration-none">
                        <div className="card shadow-sm dapp-card">
                            <div className="card-body text-center">
                                <h5 className="card-title">🔄 Script Swap</h5>
                                <p className="card-text">Échangez des tokens en un clic.</p>
                            </div>
                        </div>
                    </a>
                </div>

                {/* Telescript */}
                <div className="col-md-4">
                    <a href="#/dapps/telescript" className="text-decoration-none">
                        <div className="card shadow-sm dapp-card">
                            <div className="card-body text-center">
                                <h5 className="card-title">📜 Telescript (Telegram on-chain)</h5>
                                <p className="card-text">Echangez des messages chiffrés sur la blockchain.</p>
                            </div>
                        </div>
                    </a>
                </div>

                {/* PoolLiquidity */}
                <div className="col-md-4">
                    <a href="#/dapps/liquidity" className="text-decoration-none">
                        <div className="card shadow-sm dapp-card">
                            <div className="card-body text-center">
                                <h5 className="card-title">💧 Liquidity Pair (v2)</h5>
                                <p className="card-text">Ajoutez ou retirez de la liquidité.</p>
                            </div>
                        </div>
                    </a>
                </div>

                {/* TokenSwap */}
                <div className="col-md-4">
                    <a href="#/dapps/swap" className="text-decoration-none">
                        <div className="card shadow-sm dapp-card">
                            <div className="card-body text-center">
                                <h5 className="card-title">🔄 Script Swap (v2)</h5>
                                <p className="card-text">Échangez des tokens en un clic.</p>
                            </div>
                        </div>
                    </a>
                </div>



            </div>
        </div>
    );
};


export default Dapps;
