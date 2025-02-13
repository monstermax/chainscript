// http.ts

import path from 'path';
import fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { Blockchain } from "./blockchain";
import { handleRpcRequests } from './rpc';
import { Account } from './account';
import { AccountAddress } from './types/account.types';
import { jsonReplacer } from './utils';
import { Block } from './block';
import { TransactionHash } from './types/transaction.types';
import { Transaction } from './transaction';


/* ######################################################### */

const CONTRACTS_DIR = path.resolve(__dirname, "../example/scripts");


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

    // Contenu static pour react
    app.use(express.static(`${__dirname}/../www/dist`));

    app.get('/', (req, res) => routeHomepage(blockchain, req, res));

    handleAccountsRoutes(blockchain, app);
    handleBlocksRoutes(blockchain, app);
    handleTransactionsRoutes(blockchain, app);
    handleContractRoutes(blockchain, app);
}


async function routeHomepage(blockchain: Blockchain, req: express.Request, res: express.Response): Promise<void> {
    // React App
    res.sendFile(`${__dirname}/../www/dist/index.html`);
}




export function handleAccountsRoutes(blockchain: Blockchain, app: express.Express) {
    // Liste des accounts existants
    app.get("/api/accounts", (req, res) => {
        try {
            res.json(blockchain.stateManager.accountsIndex);

        } catch (err: any) {
            res.status(500).json({ error: "Erreur Blockchain" });
        }
    });


    // Récupérer un compte
    app.get("/api/accounts/:address", (req, res) => {
        try {
            const { address } = req.params;
            const account: Account = blockchain.getAccount(address as AccountAddress, null);

            if (!account) {
                res.status(404).json({ error: "Compte non trouvé" });
                return;
            }

            res.json(JSON.parse(account.toJSON()));

        } catch (err: any) {
            res.status(500).json({ error: "Erreur Blockchain" });
        }
    });

    // Récupérer le code d'un compte (contrat déployé)
    app.get("/api/accounts/:address/code", (req, res) => {
        try {
            const { address } = req.params;
            const account: Account = blockchain.getAccount(address as AccountAddress, null);

            if (!account || !account.code) {
                res.status(404).json({ error: "Aucun code trouvé pour ce compte" });
                return;
            }

            if (req.query.raw) {
                res.type('text').send(account.code);
                return;
            }

            res.json({ code: account.code });

        } catch (err: any) {
            res.status(500).json({ error: "Erreur Blockchain" });
        }
    });

    // Récupérer l'ABI d'un compte (si c'est un contrat)
    app.get("/api/accounts/:address/abi", (req, res) => {
        try {
            const { address } = req.params;
            const account: Account = blockchain.getAccount(address as AccountAddress, null);

            if (!account || !account.abi) {
                res.status(404).json({ error: "Aucune ABI trouvée pour ce compte" });
                return;
            }

            res.json({ abi: account.abi });

        } catch (err: any) {
            res.status(500).json({ error: "Erreur Blockchain" });
        }
    });
}



export function handleBlocksRoutes(blockchain: Blockchain, app: express.Express) {

    // Liste des blocks existants
    app.get("/api/blocks", (req, res) => {
        try {
            res.json(blockchain.stateManager.blocksIndex);

        } catch (err: any) {
            res.status(500).json({ error: "Erreur Blockchain" });
        }
    });


    // Récupérer un block
    app.get("/api/blocks/:blockHeight", (req, res) => {
        try {
            const { blockHeight } = req.params;
            const block: Block | null = blockchain.getBlock(Number(blockHeight));

            if (!block) {
                res.status(404).json({ error: "Block non trouvé" });
                return;
            }

            res.json(JSON.parse(block.toJSON()));

        } catch (err: any) {
            res.status(500).json({ error: "Erreur Blockchain" });
        }
    });
}



export function handleTransactionsRoutes(blockchain: Blockchain, app: express.Express) {
    // Liste des transactions existants
    app.get("/api/transactions", (req, res) => {
        try {
            res.json(blockchain.stateManager.transactionsIndex);

        } catch (err: any) {
            res.status(500).json({ error: "Erreur Blockchain" });
        }
    });


    // Récupérer une transaction
    app.get("/api/transactions/:txHash", (req, res) => {
        try {
            const { txHash } = req.params;
            const tx = blockchain.getTransactionByHash(txHash as TransactionHash);

            if (!tx) {
                res.status(404).json({ error: "Transaction non trouvée" });
                return;
            }

            res.json(JSON.parse(tx.toJSON()));

        } catch (err: any) {
            res.status(500).json({ error: "Erreur Blockchain" });
        }
    });
}




export function handleContractRoutes(blockchain: Blockchain, app: express.Express) {
    // Liste des contrats disponibles
    app.get("/api/contracts/examples/list", (req, res) => {
        fs.readdir(CONTRACTS_DIR, (err, files) => {
            if (err) {
                return res.status(500).json({ error: "Impossible de lire les fichiers" });
            }

            const contractFiles = files
                .filter(file => file.endsWith(".js"))
                .map(file => file.replace(".js", "")); // Supprime l'extension

            res.json({ contracts: contractFiles });
        });
    });

    // Récupérer le code source d'un contrat spécifique
    app.get("/api/contracts/examples/:contractName/code", (req, res) => {
        const { contractName } = req.params;
        const contractPath = path.join(CONTRACTS_DIR, `${contractName}.js`);

        if (!fs.existsSync(contractPath)) {
            res.status(404).json({ error: "Contrat non trouvé" });
            return;
        }

        const code = fs.readFileSync(contractPath, "utf-8");
        res.json({ code });
    });
}

