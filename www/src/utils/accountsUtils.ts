// accountsUtils.ts

import { ethers, formatUnits, parseUnits } from "ethers";

import { decimals } from "../config.client";

import { AccountAddress } from "@backend/types/account.types";



export function createEthWallet(): { address: string; privateKey: string, mnemonic?: string } {
    const wallet = ethers.Wallet.createRandom();

    const result = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || undefined,
    };

    return result;
}


export async function getCoinBalance(): Promise<bigint | null> {
    if (! window.ethereum || ! window.ethereum.selectedAddress) {
        console.warn('Wallet not connected');
        return null;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    const signer = await provider.getSigner();
    if (!signer) return null;

    const balance: bigint = await provider.getBalance(signer.getAddress());
    return balance;
}


export async function coinTransfer(recipient: AccountAddress, amount: bigint): Promise<ethers.TransactionResponse | null> {
    if (! window.ethereum || ! window.ethereum.selectedAddress) {
        console.warn('Wallet not connected');
        return null;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    const signer = await provider.getSigner();
    if (!signer) return null;

    const tx: ethers.TransactionResponse = await signer.sendTransaction({
        to: recipient,
        value: amount.toString(),
    });

    return tx;
}

