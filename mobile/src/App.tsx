// App.tsx

import React from "react";
import { NativeRouter, Route, Link, Routes } from 'react-router-native';
import { View, Text } from 'react-native';

//import { MetaMaskInpageProvider } from "@metamask/providers";

import { Web3Provider } from "@frontend/components/Web3Provider";

// Pages
import Home from "./pages/Home";

//import "bootstrap/dist/css/bootstrap.min.css"; // Import du CSS Bootstrap



const App: React.FC = () => {

    return (
        <Web3Provider>
            <NativeRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<Home />} />
                </Routes>
            </NativeRouter>
        </Web3Provider>
    );

};


export default App;
