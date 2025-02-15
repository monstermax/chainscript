
import React, { useState } from "react";


const Dapps: React.FC = () => {

    return (
        <div className="container mt-4">
            <h2>Applications Décentralisées</h2>

            <ul>
                <li><a href="#/dapps/telescript">Telescript</a></li>
                <li><a href="#/dapps/chaintweet">ChainTweet</a></li>
                <li><a href="#/dapps/chainchat">ChainChat</a></li>
                <li><a href="#/dapps/lppair">Liquidity Pair</a></li>
            </ul>

        </div>

    );
}


export default Dapps;

