// ChainTweetAbi.ts

import { CodeAbi } from "@backend/types/account.types";


export const ChainTweetAbi: CodeAbi = [
    {
        class: "ChainTweet",
        methods: { 
            postTweet: { inputs: ["content"], write: true },
            getLastTweets: { inputs: ["maxMessage", "offset"] } 
        },
        attributes: {},
    }
];

