
// ChainStoreAbi.ts

import { CodeAbi } from "@backend/types/account.types";


export const ChainStoreAbi: CodeAbi = [
    {
        "class": "ChainStore",
        "methods": {
            "registerCollection": {
                "inputs": [
                    "collectionId",
                    "name",
                    "description"
                ],
                "write": true
            },
            "registerProduct": {
                "inputs": [
                    "collectionId",
                    "productId",
                    "name",
                    "description",
                    "price",
                    "stock"
                ],
                "write": true
            },
            "buyProduct": {
                "inputs": [
                    "productId",
                    "amount"
                ],
                "payable": true
            },
            "_recordPurchase": {
                "inputs": [
                    "buyer",
                    "productId",
                    "amount"
                ],
                "write": false
            },
            "getCollectionInfo": {
                "inputs": [
                    "collectionId"
                ],
                "write": false
            },
            "getProductInfo": {
                "inputs": [
                    "productId"
                ],
                "write": false
            },
            "getCollections": {
                "inputs": [],
                "write": false
            }
        },
        "attributes": {
            "collections": {
                "type": "object"
            },
            "products": {
                "type": "object"
            }
        }
    }
];

