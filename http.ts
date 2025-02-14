// http.ts

import fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { Blockchain } from "./blockchain";
import { handleRpcRequests } from './rpc';


/* ######################################################### */


export async function httpListen(blockchain: Blockchain, rpcPort: number) {
    const app = express();

    app.use(cors());
    app.use(bodyParser.json());


    // Gère les requetes POST (RPC)
    handleRpcRequests(blockchain, app);

    // Gère les requetes GET (HTTP)
    handleHttpRequests(blockchain, app);


    // Démarrer le serveur
    const server = app.listen(rpcPort, () => console.log(`[RPC] 🚀 Server running on http://0.0.0.0:${rpcPort}`));

    return server;
}




function handleHttpRequests(blockchain: Blockchain, app: express.Express) {

    // Gestion des requêtes GET (ex: Explorer blockchain, voir un contrat, etc.)
    app.get('/', (req, res) => routeHomepage(blockchain, req, res));

    app.get('/web3', (req, res) => routeWeb3(blockchain, req, res));


}


async function routeHomepage(blockchain: Blockchain, req: express.Request, res: express.Response): Promise<void> {
    const content = `<html><head><title>Chainscript</title></head><body>Bienvenue sur Chainscript !</body></html>`;

    res.status(200).send(content);
}



async function routeWeb3(blockchain: Blockchain, req: express.Request, res: express.Response): Promise<void> {
    const templateFilepath = `${__dirname}/www/deploy.html`;

    if (! fs.existsSync(templateFilepath)) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end("Page Not Found");
        return;
    }


    const exampleContractFilepath = `${__dirname}/example/scripts/ContractToken1.js`;
    const exampleContractCode  = fs.existsSync(exampleContractFilepath) ? fs.readFileSync(exampleContractFilepath).toString() : 'class ExampleContract { /* your code javascript here */ }';


    let content = fs.readFileSync(templateFilepath).toString();

    content = content.replace('</textarea>', `${exampleContractCode}</textarea>`);

    res.status(200).send(content);

}


