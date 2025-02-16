// ChainChatAbi.ts

import { CodeAbi } from "@backend/types/account.types";


export const ChainChatAbi: CodeAbi = [
    {
        class: "ChainChat",
        methods: { 
            sendMessage: { inputs: ["to", "message"], write: true },
            getLastMessages: { inputs: ["userAddress", "maxMessage", "offset"] } 
        },
        attributes: {},
    }
];

