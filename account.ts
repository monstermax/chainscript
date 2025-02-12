// account.ts

import { encodeRlp, getAddress, keccak256 } from 'ethers';

import { asserts, computeHash, encodeBigintRLP, jsonReplacer } from './utils';

import type { AccountAddress, AccountData, AccountHash, CodeAbi, ContractMemory } from './types/account.types';


/* ######################################################### */


export class Account {
    public address: AccountAddress;
    public balance: bigint = 0n;
    public abi: CodeAbi | null = null;
    public code: string | null = null;
    public memory: ContractMemory | null = null;
    public transactionsCount: number = 0;
    public hash: AccountHash | null = null;
    //public lastBlockUpdate: number | null = null; // TODO: indiquer le blockHeight de la derniere modif du compte


    constructor(address: AccountAddress, balance=0n, abi: CodeAbi | null=null, code: string | null=null, transactionsCount=0, memory: ContractMemory | null=null, hash: AccountHash | null=null) {
        this.address = address;
        this.balance = balance;
        this.abi = abi;
        this.code = abi ? code : null;
        this.transactionsCount = transactionsCount;
        this.memory = memory;
        this.hash = hash;

        if (abi && !memory) {
            this.memory = {};
        }
    }


    public burn(amount: bigint) {
        asserts(amount > 0, `[Account.burn] invalid amount`);
        asserts(this.balance >= amount, `[Account.burn] insufficient balance for ${this.address}. ${this.balance} < ${amount}`);
        this.balance -= amount;
    }

    public mint(amount: bigint) {
        asserts(amount > 0, `[Account.mint] invalid amount`);
        this.balance += amount;
    }

    public incrementTransactions() {
        this.transactionsCount++;
    }


    toData(): AccountData {
        const account: Account = this;

        const accountData: AccountData = {
            address: account.address,
            balance: account.balance,
            abi: account.abi,
            code: account.code,
            memory: account.memory,
            transactionsCount: account.transactionsCount,
            hash: account.hash,
        };

        return accountData;
    }


    toJSON(): string {
        return JSON.stringify(this.toData(), jsonReplacer, 4);
    }


    computeHash(): AccountHash {
        const accountFormatted: AccountData = this.toData();
        const accountHash: AccountHash = computeHash(accountFormatted);

        return accountHash;
    }

};





export function predictContractAddress(sender: AccountAddress, nonce: bigint): AccountAddress {
    const encoded: string = encodeRlp([sender, encodeBigintRLP(nonce)]); // Encodage RLP
    const hash: string = keccak256(encoded);
    const contractAddress: AccountAddress = getAddress("0x" + hash.slice(-40)) as AccountAddress; // Prendre les 20 derniers octets

    return contractAddress;
}


