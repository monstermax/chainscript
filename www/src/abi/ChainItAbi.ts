// ChainItAbi.ts

import { CodeAbi } from "@backend/types/account.types";


export const ChainItAbi: CodeAbi = [
    {
        "class": "ChainIt",
        "methods": {
            "postThread": {
                "inputs": [
                    "title",
                    "content"
                ],
                "write": true
            },
            "commentThread": {
                "inputs": [
                    "postId",
                    "comment"
                ],
                "write": true
            },
            "getLastPosts": {
                "inputs": [
                    "maxPosts",
                    "offset"
                ],
                "write": false
            }
        },
        "attributes": {
            "posts": {
                "type": "object"
            }
        }
    }
];

