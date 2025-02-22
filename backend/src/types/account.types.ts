// account.types.ts

import { Account } from "@backend/blockchain/account";

import type { HexNumber, JsType } from "./types";
import { TransactionsIndex } from "./transaction.types";


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
    //transactionsCount: number;
    transactionsIndex: TransactionsIndex;
    hash: AccountHash | null;
    lastBlockUpdate?: number;
}


export type CodeAbi = CodeAbiClass[];

export type CodeAbiClass = {
    class: string,
    methods: CodeAbiClassMethods,
    attributes: CodeAbiClassAttributes,
};


export type CodeAbiClassMethods    = {[method: string]:    CodeAbiClassMethod};
export type CodeAbiClassAttributes = {[attribute: string]: CodeAbiClassAttribute};


export type CodeAbiClassMethod = {
    inputs?: string[],
    write?: boolean,
    payable?: boolean,
};


export type CodeAbiClassAttribute = {
    type: JsType,
}

export type CodeAbiCall = {
    className: string,
    methodName: string,
    args: any[],
};



export type AbiSearchResult = AbiSearchResultMethod | AbiSearchResultAttribute;

export type AbiSearchResultMethod = {
    type: 'method',
    className: string,
    class: CodeAbiClass,
    methodName: string,
    method: CodeAbiClassMethod,
};

export type AbiSearchResultAttribute = {
    type: 'attribute',
    className: string,
    class: CodeAbiClass,
    methodName: string,
    attribute: CodeAbiClassAttribute,
};


export type ContractMemory = Record<string, any>;




export type EthersAbi = {
    type: string;
    name: string;
    inputs: {
        name: string;
        type: string;
    }[];
    outputs: {
        name: string;
        type: string;
    }[];
    stateMutability: string;
}[];

