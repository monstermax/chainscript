// ChainTweet.js


class ChainTweet {

    tweets = []; // Liste des tweets {sender, content, timestamp}


    postTweet(content) /* write */ {
        asserts(content.length > 0, "Message vide interdit");
        asserts(content.length <= 280, "Message trop long (max 280 caractères)");

        const sender = lower(caller);

        this.tweets.push({
            sender,
            content,
            timestamp: Date.now()
        });
    }


    getLastTweets(maxMessage="100", offset="0") {
        offset = Number(offset) || 0;
        maxMessage = Number(maxMessage) || 100;

        const tweets = [ ...this.tweets ].reverse();
        return tweets.slice(offset, maxMessage) || [];
    }
}


