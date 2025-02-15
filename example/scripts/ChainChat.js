// ChainChat.js


class ChainChat {

    inbox = {} // inbox[address] = [{from, message}]


    sendMessage(to, message) /* write */ {
        to = lower(to);

        asserts(to.length > 0, "Destinataire vide interdit");
        asserts(message.length > 0, "Message vide interdit");
        //asserts(to !== caller, "Tu ne peux pas t’envoyer un message !");

        this.inbox[to] = this.inbox[to] || [];

        this.inbox[to].push({
            from: caller,
            message,
            timestamp: Date.now()
        });
    }


    getLastMessages(user, maxMessage="100", offset="0") {
        user = lower(user);
        offset = Number(offset) || 0;
        maxMessage = Number(maxMessage) || 100;

        if (! this.inbox[user]) {
            return [];
        }

        const messages = [ ...this.inbox[user] ].reverse();
        return messages.slice(offset, maxMessage) || [];
    }
}

