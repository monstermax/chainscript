// rpc.types.ts

import type { AccountAddress } from "./account.types";
import type { HexNumber } from "./types";

/* ######################################################### */


export type RpcMessage = RpcMessageReq | RpcMessageResult | RpcMessageError;

export type RpcMessageReq = {
    jsonrpc: string,
    id: number | null,
    method: string,
    params?: [],
}

export type RpcMessageResult = {
    jsonrpc: string,
    id: number | null,
    result?: any,
}

export type RpcMessageError = {
    jsonrpc: string,
    id: number | null,
    error?: string,
}


export type callTxParams = {
    from: AccountAddress,
    to: AccountAddress,
    data?: HexNumber, // Hash of the method signature and encoded parameters // spec => https://docs.soliditylang.org/en/latest/abi-spec.html
}

export type sendTxParams = {
    from: AccountAddress,
    to?: AccountAddress,
    gas?: HexNumber,
    gasPrice?: HexNumber,
    maxPriorityFeePerGas?: HexNumber,
    maxFeePerGas?: HexNumber,
    value?: HexNumber,
    data?: HexNumber, // Hash of the method signature and encoded parameters // spec => https://docs.soliditylang.org/en/latest/abi-spec.html
    nonce: HexNumber,
}