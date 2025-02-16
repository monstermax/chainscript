// utils.ts

import fs from 'fs';
import crypto from 'crypto';

import { decimals } from '../config';

import type { HexNumber } from '../types/types';


/* ######################################################### */


// Filesystem

export function ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}



// Debug

export function asserts(condition: unknown, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}



// JSON & Object mapping

export function jsonReplacer(key: string, value: any): any {
    if (typeof value === 'bigint') {
        return `bigint:${value.toString()}`;
    }

    if (typeof value === 'bigint') { // alternative
        return { _jsonReplace: true, type: 'bigint', value: value.toString() };
    }

    return value;
}


export function jsonReplacerForRpc(key: string, value: any): any {
    if (typeof value === 'bigint') {
        return value.toString(16);
    }

    return value;
}


export function jsonReviver(key: string, value: any): any {
    if (typeof value === 'string') {
        const parts = value.split(':');

        if (parts.length === 2 && parts[0] === 'bigint' && /^[0-9]+$/.test(parts[1])) {
            return BigInt(parts[1]); // "bigint:12345" => BigInt("12345")
        }
    }

    if (typeof value === 'object' && value && value._jsonReplace && value.type === 'bigint') { // alternative compatibility
        return BigInt(value.value); // { _jsonReplace: true, type: "bigint", value: "12345" } => BigInt("12345")
    }

    return value;
}


export function stringifyParams(params: any[]): string {
    if (params.length === 0) return '';

    return params.map(param => {
            if (typeof param === 'string') return `'${param.replace(/\'/g, "\\'")}'`;
            if (typeof param === 'bigint') return `${param}n`;
            return param;
        })
        .join(', ');
}




// Crypto

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



// Numbers

export function divideBigInt(val: bigint, divider: bigint, precision: number=decimals) {
    const factor = 10 ** precision;
    return Number(val * BigInt(factor) / divider) / factor;
}




// Hexadecimal

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


export function encodeBigintRLP(val: bigint): Uint8Array {
    if (val < BigInt(0)) throw new Error("encodeBigintRLP ne gère pas les nombres négatifs");

    // Convertir en hex sans préfixe 0x
    let hexNonce = val.toString(16);

    // Si la longueur est impaire, ajouter un 0 devant pour garder un format correct (pair-length)
    if (hexNonce.length % 2 !== 0) {
        hexNonce = "0" + hexNonce;
    }

    // Transformer en Uint8Array pour encodeRlp
    return Buffer.from(hexNonce, "hex");
}





// Dates

export function getUsDate(date?: Date) {
    date = date || new Date;
    return date.toLocaleDateString().split('/').reverse().join('-');
}

export function getUsDateTime(date?: Date) {
    date = date || new Date;
    return `${getUsDate(date)} ${date.toLocaleTimeString()}`;
}


export function now(): string {
    const options: { hour: string | any, minute: string | any, second: string | any } = {
        /* year: "numeric", month: "2-digit", day: "2-digit", */
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    }
    return new Date().toLocaleTimeString("fr-FR", options);
}




// Command line options

export function hasOpt(keyName: string, argv: string[] | null = null): boolean {
    argv = argv || process.argv;
    var keyNames = (typeof (keyName) == 'object') ? keyName : [keyName];

    for (var i = 0; i < keyNames.length; i++) {
        var keyName = keyNames[i];
        if (argv.indexOf(keyName) > -1) {
            return true;
        }
    }
    return false;
}


export function getOpt(keyName: string, argv: string[] | null = null): string | null {
    argv = argv || process.argv;
    var keyNames = (typeof (keyName) == 'object') ? keyName : [keyName];

    for (var i = 0; i < keyNames.length; i++) {
        var keyName = keyNames[i];
        var idx = argv.indexOf(keyName);
        if (idx > -1) {
            return (argv.length > idx + 1) ? argv[idx + 1] : null;
        }
    }
    return null;
}



