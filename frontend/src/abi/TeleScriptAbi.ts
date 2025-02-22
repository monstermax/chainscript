// TeleScriptAbi.ts

import { CodeAbi } from "@backend/types/account.types";


export const TeleScriptAbi: CodeAbi = [
    {
        "class": "TeleScript",
        "methods": {
            "registerUser": {
                "inputs": [],
                "write": true
            },
            "unregisterUser": {
                "inputs": [],
                "write": true
            },
            "registerSessionKey": {
                "inputs": [
                    "chatId",
                    "encryptedSessionKey"
                ],
                "write": true
            },
            "createChat": {
                "inputs": [
                    "encryptedSessionKeysList",
                    "isPublic",
                    "name"
                ],
                "write": true
            },
            "parseSessionKeys": {
                "inputs": [
                    "keysList"
                ],
                "write": false
            },
            "sendMessage": {
                "inputs": [
                    "chatId",
                    "encryptedMessage",
                    "nonce"
                ],
                "write": true
            },
            "getMessages": {
                "inputs": [
                    "chatId",
                    "userAddress",
                    "limit",
                    "offset"
                ],
                "write": false
            },
            "addMember": {
                "inputs": [
                    "chatId",
                    "newMember",
                    "encryptedSessionKey"
                ],
                "write": true
            },
            "removeMember": {
                "inputs": [
                    "chatId",
                    "memberToRemove"
                ],
                "write": true
            },
            "getUserChats": {
                "inputs": [
                    "userAddress"
                ],
                "write": false
            },
            "promoteToAdmin": {
                "inputs": [
                    "chatId",
                    "newAdmin"
                ],
                "write": true
            },
            "getSessionKey": {
                "inputs": [
                    "chatId",
                    "userAddress"
                ],
                "write": false
            }
        },
        "attributes": {
            "users": {
                "type": "object"
            },
            "chats": {
                "type": "object"
            }
        }
    }
];

