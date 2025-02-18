
import { ethers, getCreateAddress } from "ethers";

import { jsonReplacer } from "./utils";
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
    }

    try {

        if (false) {
            const contract = await factory.deploy(); // ERROR: the returned hash did not match (mais le contrat est déployé)
            await contract.deploymentTransaction()?.wait();
            const contractAddress: AccountAddress = await contract.getAddress() as AccountAddress;
            return contractAddress;
        }

        if (true) {
            const tx = await factory.getDeployTransaction();
            if (!tx) throw new Error("no tx");
            if (!factory.runner) throw new Error("no factory.runner");
            if (!factory.runner.sendTransaction) throw new Error("no factory.runner.sendTransaction");
            tx.nonce = Number(nonce);

            const contractAddress: AccountAddress = getCreateAddress({ from: signer.address, nonce }) as AccountAddress;
            console.log('contractAddress (prev):', contractAddress);

            const sentTx = await factory.runner.sendTransaction(tx); // ERROR: the returned hash did not match (mais le contrat est déployé)
            //const sentTx = await signer.sendTransaction(tx); // ERROR: the returned hash did not match (mais le contrat est déployé)
            if (!sentTx) throw new Error("no sentTx");

            //const contractAddress: AccountAddress = getCreateAddress(sentTx) as AccountAddress;
            console.log('contractAddress:', contractAddress);

            return contractAddress;
        }

    } catch (err: any) {
        console.log('err:', err);

        console.log('ERROR:', err.message)

        return '0x';
    }
}


export async function callSmartContract(providerOrSigner: ethers.JsonRpcProvider | ethers.JsonRpcSigner, contractAddress: AccountAddress, contractAbi: CodeAbi, methodName: string, methodArgs: string[], value?: bigint): Promise<any> {
    const ethersAbi = convertCustomAbiToEthersFormat(contractAbi);
    //console.log('ethersAbi', ethersAbi)

    const contract = new ethers.Contract(contractAddress, ethersAbi, providerOrSigner);

    const result: any = await contract[methodName](...methodArgs);
    return result;
}


export async function executeSmartContract(provider: ethers.JsonRpcProvider, contractAddress: AccountAddress, contractAbi: CodeAbi, methodName: string, methodArgs: string[], value?: bigint) {
    const signer = await provider.getSigner();

    const tx: ethers.ContractTransactionResponse = await callSmartContract(signer, contractAddress, contractAbi, methodName, methodArgs);
    console.log('Transaction envoyée:', tx);

    const receipt = await tx.wait();
    console.log('Transaction confirmée:', receipt);

    return { tx, receipt };
}


