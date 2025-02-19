// App.tsx

import React from "react";
//import { MetaMaskInpageProvider } from "metamask/providers";


import { Web3Provider } from "@frontend/components/Web3Provider";
//import { Web3Provider } from "../../www/src/components/Web3Provider";


// Pages
import Home from "./pages/Home";



const App = () => {


    return (
      <Web3Provider>
        <Home />
      </Web3Provider>
    );

};


export default App;
