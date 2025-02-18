// ChainWallet.js


class ChainWallet {
    tokens = {}; // Pour stocker les balances des tokens ERC-20
    owner;

    constructor(owner) {
        this.owner = lower(owner);
    }

    // Obtenir la balance des tokens natifs (coins)
    coinsBalance() {
        return balanceOf(self);
    }

    // Obtenir la balance d'un token ERC-20
    async tokensBalance(tokenAddress, forceUpdate) {
        tokenAddress = lower(tokenAddress);

        if (this.tokens[tokenAddress] === undefined || forceUpdate) {
            this.tokens[tokenAddress] = await call(tokenAddress, "", "balanceOf", [self]);
        }

        return this.tokens[tokenAddress];
    }

    // Mettre à jour les balances de tous les tokens enregistrés
    async updateTokensBalances() /* write */ {
        for (const tokenAddress of Object.keys(this.tokens)) {
            this.tokens[tokenAddress] = await this.tokensBalance(tokenAddress, 'yes');
        }
    }

    // Récupérer les balances de tous les tokens enregistrés
    async getTokensBalances(forceUpdate) {
        const balances = {};

        for (const tokenAddress of Object.keys(this.tokens)) {
            balances[tokenAddress] = await this.tokensBalance(tokenAddress, forceUpdate);
        }

        return balances;
    }


    // Transférer des tokens natifs (coins)
    async coinsTransfer(recipientAddress, amount) /* write */ {
        amount = BigInt(amount);
        const sender = lower(msg.sender);

        asserts(sender === this.owner, `Seul le propriétaire (${this.owner}) peut effectuer cette action.`);
        asserts(amount > 0n, "Le montant doit être positif.");
        asserts(isValidAddress(recipientAddress), "Adresse du destinataire invalide.");

        await transfer(recipientAddress, amount);
    }

    // Transférer des tokens ERC-20
    async tokensTransfer(tokenAddress, recipientAddress, amount) /* write */ {
        amount = BigInt(amount);
        const sender = lower(msg.sender);

        asserts(sender === this.owner, `Seul le propriétaire (${this.owner}) peut effectuer cette action.`);
        asserts(amount > 0n, "Le montant doit être positif.");
        asserts(isValidAddress(tokenAddress), "Adresse du token invalide.");
        asserts(isValidAddress(recipientAddress), "Adresse du destinataire invalide.");

        await call(tokenAddress, "", "transfer", [recipientAddress, amount]);
        this.tokens[tokenAddress] = await call(tokenAddress, "", "balanceOf", [self]); // Mettre à jour la balance
    }

    // Appeler un autre contrat (avec restrictions)
    async callContract(contractAddress, method, argsJson) /* write */ {
        const sender = lower(msg.sender);

        asserts(sender === this.owner, `Seul le propriétaire (${this.owner}) peut effectuer cette action.`);
        asserts(isValidAddress(contractAddress), "Adresse du contrat invalide.");

        // Limiter les méthodes autorisées (optionnel)
        const allowedMethods = ["method1", "method2"]; // Exemple de méthodes autorisées
        asserts(allowedMethods.includes(method), "Méthode non autorisée.");

        return await call(contractAddress, "", method, JSON.parse(argsJson));
    }

    // Fonction utilitaire pour valider une adresse
    isValidAddress(address) {
        return typeof address === "string" && address.length === 42 && address.startsWith("0x");
    }
}
