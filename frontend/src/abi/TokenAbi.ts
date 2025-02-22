// TokenAbi.ts

import { CodeAbi } from "@backend/types/account.types";


export const TokenAbi: CodeAbi = [
    {
        "class": "ContractToken1",
        "methods": {
            "balanceOf": {
                "inputs": [
                    "address"
                ],
                "write": false
            },
            "transfer": {
                "inputs": [
                    "recipient",
                    "amount"
                ],
                "write": true
            },
            "approve": {
                "inputs": [
                    "spender",
                    "amount"
                ],
                "write": true
            },
            "allowance": {
                "inputs": [
                    "owner",
                    "spender"
                ],
                "write": false
            },
            "transferFrom": {
                "inputs": [
                    "owner",
                    "recipient",
                    "amount"
                ],
                "write": true
            }
        },
        "attributes": {
            "name": {
                "type": "string"
            },
            "symbol": {
                "type": "string"
            },
            "owner": {
                "type": "string"
            },
            "decimals": {
                "type": "number"
            },
            "supply": {
                "type": "bigint"
            },
            "accounts": {
                "type": "object"
            },
            "allowances": {
                "type": "object"
            }
        }
    },
    {
        "class": "ContractToken2",
        "methods": {
            "balanceOf": {
                "inputs": [
                    "_address"
                ],
                "write": false
            },
            "transfer": {
                "inputs": [
                    "recipient",
                    "amount"
                ],
                "write": true
            },
            "approve": {
                "inputs": [
                    "spender",
                    "amount"
                ],
                "write": true
            },
            "allowance": {
                "inputs": [
                    "owner",
                    "spender"
                ],
                "write": false
            },
            "transferFrom": {
                "inputs": [
                    "owner",
                    "recipient",
                    "amount"
                ],
                "write": true
            }
        },
        "attributes": {
            "name": {
                "type": "undefined"
            },
            "symbol": {
                "type": "undefined"
            },
            "owner": {
                "type": "string"
            },
            "decimals": {
                "type": "number"
            },
            "supply": {
                "type": "bigint"
            },
            "accounts": {
                "type": "object"
            },
            "allowances": {
                "type": "object"
            }
        }
    },
];