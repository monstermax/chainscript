// utils.ts

import fs from 'fs';
import crypto from 'crypto';

import { Block } from './block';
import { decimals, fullcoin } from './config';

import type { HexNumber } from './types/types';
import { BlockData, Blocks } from './types/block.types';
import { Accounts, ContractMemory } from './types/account.types';


/* ######################################################### */


export function asserts(condition: unknown, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}


export function jsonReplacer(key: string, value: any): any {
    return typeof value === 'bigint'
        ? { _jsonReplace: true, type: 'bigint', value: value.toString() }
        : value // return everything else unchanged
}


export function jsonReplacerForRpc(key: string, value: any): any {
    return typeof value === 'bigint'
        //? value.toString() // to string
        ? value.toString(16) // to hex
        : value // return everything else unchanged
}


export function jsonReviver(key: string, value: any): any {
    if (typeof value === 'object' && value && value._jsonReplace && value.type === 'bigint') {
        return BigInt(value.value);
    }

    return value;
}


export function stringifyParams(params: any[]): string {
    if (params.length === 0) return '';

    return params.map(param => {
            if (typeof param === 'string') return `"${param}"`;
            if (typeof param === 'bigint') return `${param}n`;
            return param;
        })
        .join(', ');
}


/** 🔒 Calcule un hash SHA-256 d'un objet sans le champ `hash` */
export function computeHash(data: object): HexNumber {
    const dataWithoutHash = { ...data };
    delete (dataWithoutHash as any).hash;

    const dataToHash = Object.fromEntries(Object.entries(dataWithoutHash).sort());
    const json: string = JSON.stringify(dataToHash, jsonReplacer, 4);

    // Calculer le hash SHA-256
    return computeStrHash(json);
}


export function computeStrHash(dataToHash: string): HexNumber {
    return '0x' + crypto.createHash('sha256').update(dataToHash).digest('hex') as HexNumber;
}


export function ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}




export function dumpAccountsBalances(accounts: Accounts, asFullCoin = false): { [address: string]: bigint | string } {
    return Object.fromEntries(
        Object.keys(accounts)
            .map(address => {
                return asFullCoin
                    ? [address, divideBigInt(accounts[address].balance, fullcoin).toFixed(decimals)]
                    : [address, accounts[address].balance];
            })
    );
}


export function dumpAccountsMemories(accounts: Accounts): { [address: string]: ContractMemory | null } {
    return Object.fromEntries(
        Object.keys(accounts)
            .map(address => [address, accounts[address].memory])
    );
}


export function dumpBlocks(blocks: Blocks): { [blockHeight: number]: BlockData } {
    return Object.fromEntries(
        Object.keys(blocks)
            .map((blockHeightAsStr: string) => [Number(blockHeightAsStr), Block.toJSON(blocks[Number(blockHeightAsStr)])])
    );
}



export function divideBigInt(val: bigint, divider: bigint, precision: number=decimals) {
    const factor = 10 ** precision;
    return Number(val * BigInt(factor) / divider) / factor;
}


export function toHex(val: number | bigint): HexNumber {
    return `0x${val.toString(16)}`;
}


export function fromHex(val: HexNumber): number {
    return parseInt(val, 16);
}


export function bufferToHex(buffer: ArrayBuffer): string {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}


export function hexToUint8Array(hex: string): Uint8Array {
    if (hex.startsWith("0x")) hex = hex.slice(2);
    return new Uint8Array(Buffer.from(hex, "hex"));
}

