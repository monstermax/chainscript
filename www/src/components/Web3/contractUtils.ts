
import { ContractTransactionResponse, ethers } from "ethers";

import { convertCustomAbiToEthersFormat } from "./abiUtils";

import type { AccountAddress, CodeAbi } from "@backend/types/account.types";



export async function callSmartContract(providerOrSigner: ethers.BrowserProvider | ethers.JsonRpcSigner, contractAddress: AccountAddress, contractAbi: CodeAbi, methodName: string, methodArgs: string[]): Promise<any> {
    const ethersAbi = convertCustomAbiToEthersFormat(contractAbi);
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

