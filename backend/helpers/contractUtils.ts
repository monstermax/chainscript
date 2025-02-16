
import { AbiCoder, ContractTransactionResponse, ethers } from "ethers";

import { jsonReplacer } from "./utils";
import { convertCustomAbiToEthersFormat } from "./abiUtils";

import type { AccountAddress, CodeAbi } from "@backend/types/account.types";




export async function deployContract(provider: ethers.BrowserProvider, code: string, className: string, constructorParams: string[]): Promise<AccountAddress> {
    const signer = await provider.getSigner();

    const constructorParamsJSON = JSON.stringify(constructorParams, jsonReplacer);

    const coder = new AbiCoder();
    const bytecode = coder.encode(["string", "string", "string"], [code, className, constructorParamsJSON]);

    const factory = new ethers.ContractFactory([], bytecode, signer);
    const contract = await factory.deploy();

    await contract.deploymentTransaction()?.wait();

    const contractAddress: AccountAddress = await contract.getAddress() as AccountAddress;

    return contractAddress;
}


export async function callSmartContract(providerOrSigner: ethers.BrowserProvider | ethers.JsonRpcSigner, contractAddress: AccountAddress, contractAbi: CodeAbi, methodName: string, methodArgs: string[]): Promise<any> {
    const ethersAbi = convertCustomAbiToEthersFormat(contractAbi);
    //console.log('ethersAbi', ethersAbi)

    const contract = new ethers.Contract(contractAddress, ethersAbi, providerOrSigner);

    const result: any = await contract[methodName](...methodArgs);
    return result;
}


export async function executeSmartContract(provider: ethers.BrowserProvider, contractAddress: AccountAddress, contractAbi: CodeAbi, methodName: string, methodArgs: string[]) {
    const signer = await provider.getSigner();

    const tx: ContractTransactionResponse = await callSmartContract(signer, contractAddress, contractAbi, methodName, methodArgs);
    console.log('Transaction envoyée:', tx);

    const receipt = await tx.wait();
    console.log('Transaction confirmée:', receipt);

    return { tx, receipt };
}


