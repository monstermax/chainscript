// numberUtils.ts

import { decimals } from "../config.client";


export function divideBigInt(val: bigint, divider: bigint, precision: number=decimals) {
    const factor = 10 ** precision;
    return Number(val * BigInt(factor) / divider) / factor;
}




export function formatAmountEtherSafe(value: string): string | null {

    // replace ","
    value = value.replace(',', '.');

    const endsWithDot = value.endsWith('.') && value.split('.').length === 2;
    if (endsWithDot) value = value.slice(0, -1);

    // check & format number
    if (isNaN(Number(value))) return null;
    value = (Number(value) || 0).toString();

    // add "0" after "."
    if (endsWithDot) value += '.';

    return value;
}
