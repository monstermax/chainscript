// ChainTweet.js

// non testé. merci chatgpt


class ChainTweet {

    #memory = memory({
        tweets: [], // Liste des tweets {sender, content, timestamp}
    });


    postTweet(content) /* write */ {
        asserts(content.length > 0, "Message vide interdit");
        asserts(content.length <= 280, "Message trop long (max 280 caractères)");

        this.#memory.tweets.push({
            sender: caller,
            content,
            timestamp: Date.now()
        });
    }

    getTweets() {
        return this.#memory.tweets;
    }
}

