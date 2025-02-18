// test_deploy.ts

import path from 'path';
import fs from 'fs';
import { ethers, resolveProperties, Transaction, TransactionResponse } from 'ethers';

import { deployContract } from '../helpers/contractUtils';
import { defaultRpcPort, devPrivateKey } from '../config';

import { AccountAddress } from '@backend/types/account.types';


/* ######################################################### */


const ROOT_DIR = path.resolve(__dirname, "../..");
const CONTRACTS_DIR = path.resolve(ROOT_DIR, "example/scripts");

let nonce = 0n;

/* ######################################################### */


async function main() {
    const { signer } = getProvider();
    nonce = BigInt(await signer.getNonce());

    const addresses: Record<string, AccountAddress | Record<string, AccountAddress>> = {};


    // Tokens
    addresses.Tokens = {
        WDEV: await deployToken1(signer, ['Wrapped DEV', 'WDEV']), // 18 decimals / 10 milliards de supply
        Token1: await deployToken1(signer), // 18 decimals / 10 milliards de supply
        Token2: await deployToken2(signer), // 8 decimals / 21 millions de supply
        ChainCoin: await deployToken2(signer, ['ChainCoin', 'CHC']), // 8 decimals / 21 millions de supply
        BTCjs: await deployToken2(signer, ['Bitcoin JS', 'BTCjs']), // 8 decimals / 21 millions de supply
        EtherJS: await deployToken1(signer, ['Ether JS', 'ETHjs']), // 18 decimals / 10 milliards de supply
        USDjs: await deployToken1(signer, ['USD-JS', 'USDjs']), // 18 decimals / 10 milliards de supply
    }


    // Lp Pairs
    addresses.LpPairs = {
        WDEV_Token1: await deployLpPair(signer, [addresses.Tokens.WDEV, addresses.Tokens.Token1]),
        WDEV_Token2: await deployLpPair(signer, [addresses.Tokens.WDEV, addresses.Tokens.Token2]),
        WDEV_ChainCoin: await deployLpPair(signer, [addresses.Tokens.WDEV, addresses.Tokens.ChainCoin]),
        WDEV_BTCjs: await deployLpPair(signer, [addresses.Tokens.WDEV, addresses.Tokens.BTCjs]),
        WDEV_EtherJS: await deployLpPair(signer, [addresses.Tokens.WDEV, addresses.Tokens.EtherJS]),
        WDEV_USDjs: await deployLpPair(signer, [addresses.Tokens.WDEV, addresses.Tokens.USDjs]),
    };

    //addresses.LpPair = addresses.LpPairs.WDEV_Token1;


    // AMM Router
    addresses.AmmRouter = await deployAmmRouter(signer);


    // NFT
    addresses.NftToken = await deployNftToken(signer);


    // dApps
    addresses.dApps = {
        ChainChat: await deployChainChat(signer),
        ChainIt: await deployChainIt(signer),
        ChainTweet: await deployChainTweet(signer),
        TeleScript: await deployTeleScript(signer),
        ChainStore: await deployChainStore(signer),
    }


    console.log(addresses);
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
        }

        return provider._wrapTransactionResponse(<any>tx, network).replaceableTransaction(blockNumber);
    };

    return { provider, signer };
}


async function deployToken1(signer: ethers.Wallet, constructorArgs=['','']) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ContractToken1.js`).toString();
    const className = 'ContractToken1';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++); // args: [name, symbol]
    return contractAddress;
}


async function deployToken2(signer: ethers.Wallet, constructorArgs=['','']) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ContractToken2.js`).toString();
    const className = 'ContractToken2';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++); // args: [name, symbol]
    return contractAddress;
}


async function deployNftToken(signer: ethers.Wallet, constructorArgs=['','']) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/NFTToken.js`).toString();
    const className = 'NFTToken';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++); // args: [name, symbol]
    return contractAddress;
}


async function deployAmmRouter(signer: ethers.Wallet, constructorArgs=[]) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/AMMRouter.js`).toString();
    const className = 'AMMRouter';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployLpPair(signer: ethers.Wallet, constructorArgs=['', '']) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/LPPair.js`).toString();
    const className = 'LPPair';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++); // args: [tokenA, tokenB]
    return contractAddress;
}


async function deployChainChat(signer: ethers.Wallet, constructorArgs=[]) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ChainChat.js`).toString();
    const className = 'ChainChat';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployChainIt(signer: ethers.Wallet, constructorArgs=[]) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ChainIt.js`).toString();
    const className = 'ChainIt';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployChainTweet(signer: ethers.Wallet, constructorArgs=[]) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ChainTweet.js`).toString();
    const className = 'ChainTweet';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployTeleScript(signer: ethers.Wallet, constructorArgs=[]) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/TeleScript.js`).toString();
    const className = 'TeleScript';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}


async function deployChainStore(signer: ethers.Wallet, constructorArgs=[]) {
    const contractCode = fs.readFileSync(`${CONTRACTS_DIR}/ChainStore.js`).toString();
    const className = 'ChainStore';
    const contractAddress = await deployContract(signer, contractCode, className, constructorArgs, nonce++);
    return contractAddress;
}




/* ######################################################### */

main();


