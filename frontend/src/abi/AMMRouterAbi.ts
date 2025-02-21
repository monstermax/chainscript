// AMMRouterAbi.ts

import { CodeAbi } from "@backend/types/account.types";


export const AMMRouterAbi: CodeAbi = [
    {
        "class": "AMMRouter",
        "methods": {
            "registerPair": {
                "inputs": [
                    "pairAddress",
                    "tokenA",
                    "tokenB"
                ],
                "write": true
            },
            "findBestPair": {
                "inputs": [
                    "tokenIn",
                    "tokenOut"
                ],
                "write": false
            },
            "swap": {
                "inputs": [
                    "tokenIn",
                    "tokenOut",
                    "amountIn"
                ],
                "write": true
            },
            "getAmountsOut": {
                "inputs": [
                    "amountIn",
                    "pathList"
                ],
                "write": false
            },
            "swapExactTokensForTokens": {
                "inputs": [
                    "amountIn",
                    "amountOutMin",
                    "pathList"
                ],
                "write": true
            }
        },
        "attributes": {
            "pairs": {
                "type": "object"
            }
        },
    }
];


