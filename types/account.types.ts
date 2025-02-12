// account.types.ts

import { Account } from "../account";

import type { HexNumber, JsType } from "./types";


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
    methods: CodeAbiClassMethods,
    attributes: CodeAbiClassAttributes,
};


export type CodeAbiClassMethods = {[method: string]: CodeAbiClassMethod};
export type CodeAbiClassAttributes = {[attr: string]: { type: JsType } };


export type CodeAbiClassMethod = {
    //public?: boolean,
    inputs?: string[],
    //payable?: boolean,
};


export type CodeAbiCall = {
    className: string,
    methodName: string,
    args: any[],
};



export type AbiClassMethod = {
    className: string,
    methodName: string,
    class: CodeAbiClass,
    method: CodeAbiClassMethod,
};


export type ContractMemory = Record<string, any>;
