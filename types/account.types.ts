// account.types.ts

import { Account } from "../account";

import type { HexNumber } from "./types";


/* ######################################################### */


export type AccountAddress = `0x${string}`;

export type AccountHash = HexNumber;

export type Accounts = { [address: string]: Account };

export type AccountsIndex = Record<AccountAddress, AccountHash>;


export type AccountData = {
    address: AccountAddress;
    balance: bigint;
    abi: CodeAbi | null;
    code: string | null;
    memory: ContractMemory | null;
    transactionsCount: number;
    hash: AccountHash | null;
    //lastBlockUpdate: number; // TODO: indiquer le blockHeight de la derniere modif du compte
}


export type CodeAbi = CodeAbiClass[];

export type CodeAbiClass = {
    class: string,
    methods: {[method: string]: CodeAbiMethod}
};

export type CodeAbiMethod = {
    inputs?: any[],
    output?: any,
    public?: boolean,
    payable?: boolean,
};


export type ContractMemory = Record<string, any>;
