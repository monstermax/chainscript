// test_deploy.ts

import path from 'path';
import fs from 'fs';
import { ethers, resolveProperties, Transaction, TransactionResponse } from 'ethers';

import { deployContract, executeSmartContract } from '@backend/helpers/contractUtils';
import { defaultRpcPort, devPrivateKey, FULLNODE_DIR } from '@backend/config';

import { AMMRouterAbi } from '@frontend/abi/AMMRouterAbi';
import { contractsAddresses } from '@frontend/config.client';


/* ######################################################### */

type Addresses = Awaited<ReturnType<typeof deployContracts>>;

/* ######################################################### */


const CONTRACTS_DIR = path.resolve(FULLNODE_DIR, "example/scripts");

let nonce = 0n;

/* ######################################################### */


async function main() {
    const { signer } = getProvider();
    nonce = BigInt(await signer.getNonce());

    // Deploiement des contrats
    //const addresses = contractsAddresses as Addresses;

    //await deployToken1(signer, ['Wrapped DEV', 'WDEV']); // tet de deploiement d'un seul contrat

    // Configuration des contrats
    const addresses = await deployContracts(signer);
    console.log(addresses);

    // Configuration des contrats
    await configureContracts(signer, addresses);

}



function getProvider(): { provider: ethers.JsonRpcProvider, signer: ethers.Wallet } {
    // Charge le provider & signer ET patch la fonction broadcastTransaction
    const rpcUrl = `http://localhost:${defaultRpcPort}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { batchMaxCount: 1 });
    const signer = new ethers.Wallet(devPrivateKey, provider);

    // Patch pour contourner la difference de hashing des transactions imposés par JsonRpcProvider
    provider.broadcastTransaction = async (signedTx: string): Promise<TransactionResponse> => {
        const { blockNumber, hash, network } = await resolveProperties({
            blockNumber: provider.getBlockNumber(),
            hash: provider._perform({
                method: "broadcastTransaction",
                signedTransaction: signedTx
            }),
            network: provider.getNetwork()
        });

        const tx = Transaction.from(signedTx);

        if (tx.hash !== hash) {
            //throw new Error("@TODO: the returned hash did not match");
            //console.warn(`the returned hash did not match : ${tx.hash} !== ${hash}`);

            Object.defineProperty(tx, 'hash', { value: hash });
        }

        return provider._wrapTransactionResponse(<any>tx, network).replaceableTransaction(blockNumber);
    };

    return { provider, signer };
}



async function deployContracts(signer: ethers.Wallet) {

    // Tokens
    const TokenPromises = {
        WDEV: deployToken1(signer, ['Wrapped DEV', 'WDEV']), // 18 decimals / 10 milliards de supply
        Token1: deployToken1(signer), // 18 decimals / 10 milliards de supply
        Token2: deployToken2(signer), // 8 decimals / 21 millions de supply
        ChainCoin: deployToken2(signer, ['ChainCoin', 'CHC']), // 8 decimals / 21 millions de supply
        BTCjs: deployToken2(signer, ['Bitcoin JS', 'BTCjs']), // 8 decimals / 21 millions de supply
        EtherJS: deployToken1(signer, ['Ether JS', 'ETHjs']), // 18 decimals / 10 milliards de supply
        USDjs: deployToken1(signer, ['USD-JS', 'USDjs']), // 18 decimals / 10 milliards de supply
    }

    const Tokens = await resolvePromises(TokenPromises);




    // Lp Pairs
    const LpPairsPromises = {
        WDEV_Token1: deployLpPair(signer, [Tokens.WDEV, Tokens.Token1]),
        WDEV_Token2: deployLpPair(signer, [Tokens.WDEV, Tokens.Token2]),
        WDEV_ChainCoin: deployLpPair(signer, [Tokens.WDEV, Tokens.ChainCoin]),
        WDEV_BTCjs: deployLpPair(signer, [Tokens.WDEV, Tokens.BTCjs]),
        WDEV_EtherJS: deployLpPair(signer, [Tokens.WDEV, Tokens.EtherJS]),
        WDEV_USDjs: deployLpPair(signer, [Tokens.WDEV, Tokens.USDjs]),
    };

    const LpPairs = await resolvePromises(LpPairsPromises);


    // AMM Router
    const AmmRouter = await deployAmmRouter(signer);


    // NFT
    const NftToken = await deployNftToken(signer);


    // dApps
    const dAppsPromises = {
        ChainChat: deployChainChat(signer),
        ChainIt: deployChainIt(signer),
        ChainTweet: deployChainTweet(signer),
        TeleScript: deployTeleScript(signer),
        ChainStore: deployChainStore(signer),
    }

    const dApps = await resolvePromises(dAppsPromises);


    const addresses = {
        Tokens,
        LpPairs,
        AmmRouter,
        NftToken,
        dApps,
    };

    return addresses;
}



async function configureContracts(signer: ethers.Wallet, addresses: Addresses) {

    // AMM Router
    await configureAmmRouter(signer, addresses);

}




async function deployToken1(signer: ethers.Wallet, constructorArgs = ['', '']) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ContractToken1.js`).toString();
    const className = 'ContractToken1';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++); // args: [name, symbol]
    return contractAddress;
}


async function deployToken2(signer: ethers.Wallet, constructorArgs = ['', '']) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ContractToken2.js`).toString();
    const className = 'ContractToken2';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++); // args: [name, symbol]
    return contractAddress;
}


async function deployNftToken(signer: ethers.Wallet, constructorArgs = ['', '']) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/NFTToken.js`).toString();
    const className = 'NFTToken';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++); // args: [name, symbol]
    return contractAddress;
}


async function deployAmmRouter(signer: ethers.Wallet, constructorArgs = []) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/AMMRouter.js`).toString();
    const className = 'AMMRouter';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployLpPair(signer: ethers.Wallet, constructorArgs = ['', '']) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/LPPair.js`).toString();
    const className = 'LPPair';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++); // args: [tokenA, tokenB]
    return contractAddress;
}


async function deployChainChat(signer: ethers.Wallet, constructorArgs = []) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ChainChat.js`).toString();
    const className = 'ChainChat';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployChainIt(signer: ethers.Wallet, constructorArgs = []) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ChainIt.js`).toString();
    const className = 'ChainIt';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployChainTweet(signer: ethers.Wallet, constructorArgs = []) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ChainTweet.js`).toString();
    const className = 'ChainTweet';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployTeleScript(signer: ethers.Wallet, constructorArgs = []) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/TeleScript.js`).toString();
    const className = 'TeleScript';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployChainStore(signer: ethers.Wallet, constructorArgs = []) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ChainStore.js`).toString();
    const className = 'ChainStore';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}



async function configureAmmRouter(signer: ethers.Wallet, addresses: Addresses) {
    const ammRouterAddress = addresses.AmmRouter;
    const pairs = addresses.LpPairs;
    const tokens = addresses.Tokens;

    const promises = [
        // registerPair WDEV / ChainCoin
        executeSmartContract(signer, ammRouterAddress, AMMRouterAbi, 'registerPair', [
            pairs.WDEV_ChainCoin, tokens.WDEV, tokens.ChainCoin,
        ], 0n, nonce++)
            .catch((err) => console.warn(err.message)),

        // registerPair WDEV / BTCjs
        executeSmartContract(signer, ammRouterAddress, AMMRouterAbi, 'registerPair', [
            pairs.WDEV_BTCjs, tokens.WDEV, tokens.BTCjs,
        ], 0n, nonce++)
            .catch((err) => console.warn(err.message)),

        // registerPair WDEV / EtherJS
        executeSmartContract(signer, ammRouterAddress, AMMRouterAbi, 'registerPair', [
            pairs.WDEV_EtherJS, tokens.WDEV, tokens.EtherJS,
        ], 0n, nonce++)
            .catch((err) => console.warn(err.message)),

        // registerPair WDEV / Token1
        executeSmartContract(signer, ammRouterAddress, AMMRouterAbi, 'registerPair', [
            pairs.WDEV_Token1, tokens.WDEV, tokens.Token1,
        ], 0n, nonce++)
            .catch((err) => console.warn(err.message)),

        // registerPair WDEV / Token2
        executeSmartContract(signer, ammRouterAddress, AMMRouterAbi, 'registerPair', [
            pairs.WDEV_Token2, tokens.WDEV, tokens.Token2,
        ], 0n, nonce++)
            .catch((err) => console.warn(err.message)),

        // registerPair WDEV / USDjs
        executeSmartContract(signer, ammRouterAddress, AMMRouterAbi, 'registerPair', [
            pairs.WDEV_USDjs, tokens.WDEV, tokens.USDjs,
        ], 0n, nonce++)
            .catch((err) => console.warn(err.message)),

    ];

    await Promise.all(promises);
}



async function resolvePromises<T extends Record<string, Promise<any>>>(promiseObject: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
    // Récupérer les entrées (clé, promesse)
    const entries = Object.entries(promiseObject);

    // Attendre que toutes les promesses soient résolues
    const resolvedValues = await Promise.all(entries.map(([_, promise]) => promise));

    // Reconstruire l'objet avec les valeurs résolues
    const result: any = {};
    entries.forEach(([key], index) => {
        result[key] = resolvedValues[index];
    });

    return result;
}



/* ######################################################### */

main();


