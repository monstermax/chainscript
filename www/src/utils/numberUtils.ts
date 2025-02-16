// numberUtils.ts

import { decimals } from "../config.client";


export function divideBigInt(val: bigint, divider: bigint, precision: number=decimals) {
    const factor = 10 ** precision;
    return Number(val * BigInt(factor) / divider) / factor;
}


