// ChainChat.js

// non testé. merci chatgpt


class ChainChat {

    #memory = memory({
        inbox: {} // inbox[address] = [{from, message}]
    });


    sendMessage(to, encryptedMessage) /* write */ {
        asserts(to !== caller, "Tu ne peux pas t’envoyer un message !");
        asserts(encryptedMessage.length > 0, "Message vide interdit");

        this.#memory.inbox[to] = this.#memory.inbox[to] || [];

        this.#memory.inbox[to].push({
            from: caller,
            message: encryptedMessage,
            timestamp: Date.now()
        });
    }


    getMyMessages() {
        return this.#memory.inbox[caller] || [];
    }
}

