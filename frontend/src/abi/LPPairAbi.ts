// LPPairAbi.ts

import { CodeAbi } from "@backend/types/account.types";


export const LPPairAbi: CodeAbi = [
    {
        "class": "LPPair",
        "methods": {
            "addLiquidity": {
                "inputs": [
                    "amountA",
                    "amountB"
                ],
                "write": true
            },
            "removeLiquidity": {
                "inputs": [
                    "liquidityAmount"
                ],
                "write": true
            },
            "getAmountOut": {
                "inputs": [
                    "amountIn",
                    "reserveIn",
                    "reserveOut"
                ],
                "write": false
            },
            "swap": {
                "inputs": [
                    "tokenIn",
                    "amountIn"
                ],
                "write": true
            },
            "getReserves": {
                "inputs": [],
                "write": false
            }
        },
        "attributes": {
            "tokenA": {
                "type": "string"
            },
            "tokenB": {
                "type": "string"
            },
            "reservesA": {
                "type": "bigint"
            },
            "reservesB": {
                "type": "bigint"
            },
            "totalLiquidity": {
                "type": "bigint"
            },
            "liquidityBalances": {
                "type": "object"
            },
            "feePercent": {
                "type": "bigint"
            }
        }
    }
];
