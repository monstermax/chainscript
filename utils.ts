// utils.ts

import fs from 'fs';
import crypto from 'crypto';
import { HexNumber } from './types';

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
    // Sinon, on convertit l'objet en JSON en supprimant `hash` et en triant les clés
    const dataWithoutHash = { ...data };
    delete (dataWithoutHash as any).hash;

    const dataToHash: string = JSON.stringify(Object.fromEntries(Object.entries(dataWithoutHash).sort()), jsonReplacer, 4);

    // Calculer le hash SHA-256
    return computeStrHash(dataToHash);
}


export function computeStrHash(dataToHash: string): HexNumber {
    return '0x' + crypto.createHash('sha256').update(dataToHash).digest('hex') as HexNumber;
}


export function ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

