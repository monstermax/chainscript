// ChainChatAbi.ts

import { CodeAbi } from "@backend/types/account.types";


export const ChainChatAbi: CodeAbi = [
    {
        "class": "ChainChat",
        "methods": {
            "sendMessage": {
                "inputs": [
                    "to",
                    "message"
                ],
                "write": true
            },
            "getLastMessages": {
                "inputs": [
                    "user",
                    "maxMessage",
                    "offset"
                ],
                "write": false
            }
        },
        "attributes": {
            "inbox": {
                "type": "object"
            }
        }
    }
];

