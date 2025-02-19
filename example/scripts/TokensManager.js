// TokensManager.js


class TokensManager {
    tokens = {};
    users = {};


    // Obtenir la balance d'un token ERC-20
    async balanceOf(tokenAddress, userAddress) {
        tokenAddress = lower(tokenAddress ?? '');
        userAddress = lower(userAddress ?? '');

        asserts(tokenAddress, `tokenAddress manquant`);
        asserts(tokenAddress, `userAddress manquant`);

        // Fetch user balance
        return await call(tokenAddress, "", "balanceOf", [userAddress]);
    }

    // Récupérer les balances de tous les tokens enregistrés
    async getTokensBalances(userAddress) {
        userAddress = lower(userAddress ?? '');

        asserts(userAddress, `userAddress manquant`);

        const balances = {};

        if (this.users[userAddress]) {
            for (const tokenAddress of Object.keys(this.users[userAddress])) {
                balances[tokenAddress] = await this.balanceOf(tokenAddress);
            }
        }

        return balances;
    }


    async updateTokenBalance(tokenAddress, userAddress) /* write */ {
        tokenAddress = lower(tokenAddress ?? '');
        userAddress = lower(userAddress || msg.sender || '');

        asserts(tokenAddress, `tokenAddress manquant`);
        asserts(userAddress, `userAddress manquant`);

        // Add token to registry
        if (! this.tokens[tokenAddress]) {
            this.tokens[tokenAddress] = await call(tokenAddress, "", "name");
        }

        const balance = await this.balanceOf(tokenAddress, userAddress);

        if (balance > 0n) {
            this.users[userAddress] = this.users[userAddress] || {};
            this.users[userAddress][tokenAddress] = balance;
        }

        return balance;
    }


    async updateTokensBalance(userAddress) /* write */ {
        userAddress = lower(userAddress ?? '');

        asserts(userAddress, `userAddress manquant`);
        asserts(this.users[userAddress], `user manquant`);

        for (const tokenAddress of Object.keys(this.users[userAddress])) {
            balances[tokenAddress] = await this.updateTokenBalance(tokenAddress);
        }
    }

}

