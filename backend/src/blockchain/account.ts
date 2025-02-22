// account.ts

import { encodeRlp, getAddress, keccak256 } from 'ethers';

import { asserts, computeHash, encodeBigintRLP, jsonReplacer } from '@backend/helpers/utils';

import type { AccountAddress, AccountData, AccountHash, CodeAbi, ContractMemory } from '@backend/types/account.types';
import type { TransactionHash, TransactionsIndex } from '@backend/types/transaction.types';
import { Transaction } from './transaction';
import { Block } from './block';


/* ######################################################### */


export class Account {
    public address: AccountAddress;
    public balance: bigint = 0n;
    public abi: CodeAbi | null = null;
    public code: string | null = null;
    public memory: ContractMemory | null = null;
    public hash: AccountHash | null = null;
    public transactionsIndex: TransactionsIndex = {}; // TODO: lister les transactions de chaque compte et l'enregistrer dans le fichier JSON


    constructor(address: AccountAddress) {
        this.address = address;
        //this.balance = balance;
        //this.abi = abi;
        //this.code = abi ? code : null;
        //this.transactionsCount = transactionsCount;
        //this.memory = memory;
        //this.hash = hash;

        //if (abi && !memory) {
        //    this.memory = {};
        //}
    }


    static from(accountData: AccountData) {
        const account = new Account(accountData.address);
        Object.assign(account, accountData);

        return account;
    }


    transactionsCount() {
        return Object.keys(this.transactionsIndex).length;
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


    public addTransaction(tx: Transaction) {
        asserts(tx.hash, `[Account.addTransaction] missing tx hash`);
        asserts(tx.blockHeight, `[Account.addTransaction] missing tx blockHeight`);

        const txHash = tx.hash as TransactionHash;
        this.transactionsIndex[txHash] = tx.blockHeight;
    }


    toData(): AccountData {
        const account: Account = this;

        const accountData: AccountData = {
            address: account.address,
            balance: account.balance,
            abi: account.abi,
            code: account.code,
            memory: account.memory,
            transactionsIndex: account.transactionsIndex,
            hash: account.hash,
            //lastBlockUpdate: Math.max(...Object.values(account.transactionsIndex)),
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

    return contractAddress; // TODO: a remplacer par ethers.utils.getContractAddress => https://docs.ethers.org/v5/api/utils/address/#utils-getContractAddress
}


