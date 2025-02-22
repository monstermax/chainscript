// contractUtils.ts

import { ethers, getCreateAddress } from "ethers";

import { jsonReplacer, toHex } from "./utils";
import { convertCustomAbiToEthersFormat } from "./abiUtils";

import type { AccountAddress, CodeAbi } from "@backend/types/account.types";





export async function deployContract(signer: ethers.Wallet, code: string, className: string, constructorParams: string[], nonce?: bigint): Promise<AccountAddress> {
    const constructorParamsJSON = JSON.stringify(constructorParams, jsonReplacer);

    console.log(`Deploiement en cours contrat "${className}" (nonce=${nonce}) ...`);

    const coder = new ethers.AbiCoder();
    const bytecode = coder.encode(["string", "string", "string"], [code, className, constructorParamsJSON]);

    const factory = new ethers.ContractFactory([], bytecode, signer);

    if (typeof nonce !== 'bigint') {
        nonce = BigInt(await signer.getNonce());
        console.log('NONCE AUTOMATIC :', nonce)
    }

    try {

        if (false) {
            const contract = await factory.deploy(); // ERROR: the returned hash did not match (mais le contrat est déployé)
            await contract.deploymentTransaction()?.wait();
            const contractAddress: AccountAddress = await contract.getAddress() as AccountAddress;
            return contractAddress;
        }

        if (true) {
            const tx = await factory.getDeployTransaction( {from: signer.address, nonce: Number(nonce)} );
            if (!tx) throw new Error("no tx");
            if (!factory.runner) throw new Error("no factory.runner");
            if (!factory.runner.sendTransaction) throw new Error("no factory.runner.sendTransaction");
            //tx.nonce = Number(nonce);
            //tx.from = signer.address;

            const contractAddress: AccountAddress = getCreateAddress({ from: signer.address, nonce }) as AccountAddress;
            console.log('contractAddress (prev):', contractAddress);

            const sentTx = await factory.runner.sendTransaction(tx); // ERROR: the returned hash did not match (mais le contrat est déployé)
            //const sentTx = await signer.sendTransaction(tx); // ERROR: the returned hash did not match (mais le contrat est déployé)
            if (!sentTx) throw new Error("no sentTx");
            //console.log('Transaction envoyée:', sentTx);
            console.log(`Transaction ${sentTx.hash} envoyée (nonce = ${nonce})`);

            const receipt = await sentTx.wait(1, 15_000);
            //console.log('Transaction confirmée:', receipt);
            console.log(`Transaction ${sentTx.hash} confirmée (nonce = ${nonce})`);

            //const contractAddress: AccountAddress = getCreateAddress(sentTx) as AccountAddress;
            console.log('contractAddress:', contractAddress);

            return contractAddress;
        }

    } catch (err: any) {
        console.log('err:', err);

        console.log('ERROR:', err.message)

        throw err;
    }
}


export async function callSmartContract(providerOrSigner: ethers.JsonRpcProvider | ethers.Wallet, contractAddress: AccountAddress, contractAbi: CodeAbi, methodName: string, methodArgs: string[], value?: bigint, nonce?: bigint): Promise<any> {
    const ethersAbi = convertCustomAbiToEthersFormat(contractAbi);
    //console.log('ethersAbi', ethersAbi)

    const contract = new ethers.Contract(contractAddress, ethersAbi, providerOrSigner);

    const txParams = {
        value: value?.toString() ?? '0',
        nonce,
    };

    const params: (string | { value: string, nonce?: bigint })[] = (value || nonce) ? [...methodArgs, txParams] : methodArgs;

    const result: any = await contract[methodName](...params);
    return result;
}


export async function executeSmartContract(signer: ethers.Wallet, contractAddress: AccountAddress, contractAbi: CodeAbi, methodName: string, methodArgs: string[], value?: bigint, nonce?: bigint) {

    console.log(`Execution en cours contrat "${contractAddress}" methode "${methodName}" (nonce=${nonce}) ...`);

    if (typeof nonce !== 'bigint') {
        nonce = BigInt(await signer.getNonce());
    }

    const sentTx: ethers.ContractTransactionResponse = await callSmartContract(signer, contractAddress, contractAbi, methodName, methodArgs, value, nonce);
    //console.log('Transaction envoyée:', tx);
    console.log(`Transaction ${sentTx.hash} envoyée (nonce = ${nonce})`);

    const receipt = await sentTx.wait(1, 15_000);
    //console.log('Transaction confirmée:', receipt);
    console.log(`Transaction ${sentTx.hash} confirmée (nonce = ${nonce})`);

    return { tx: sentTx, receipt };
}


