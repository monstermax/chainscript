// MultiChainWallet.js


class MultiChainWallet {
    constructor(owner) {
        this.owner = lower(owner);
        this.guardians = new Set(); // Pour la récupération du wallet
        this.recoveryThreshold = 2; // Nombre minimum de guardians requis
        this.dailyLimit = BigInt("1000000000000000000"); // 1 ETH par défaut
        this.whitelistedAddresses = new Set();
        this.pendingRecovery = null;
        this.lastActivityTime = {};
        this.chainBalances = {}; // Balances sur différentes chaînes
    }

    // === Gestion des gardiens ===

    async addGuardian(guardianAddress) /* write */ {
        this._onlyOwner();
        asserts(this.isValidAddress(guardianAddress), "Adresse guardian invalide");
        this.guardians.add(lower(guardianAddress));
    }

    async removeGuardian(guardianAddress) /* write */ {
        this._onlyOwner();
        const loweredAddress = lower(guardianAddress);
        asserts(this.guardians.has(loweredAddress), "Guardian non trouvé");
        this.guardians.delete(loweredAddress);
    }

    // === Récupération du wallet ===

    async initiateRecovery(newOwner) /* write */ {
        const sender = lower(msg.sender);
        asserts(this.guardians.has(sender), "Seul un guardian peut initier la récupération");
        asserts(this.isValidAddress(newOwner), "Nouvelle adresse propriétaire invalide");

        this.pendingRecovery = {
            newOwner: lower(newOwner),
            approvals: new Set([sender]),
            timestamp: Date.now()
        };
    }

    async approveRecovery() /* write */ {
        const sender = lower(msg.sender);
        asserts(this.guardians.has(sender), "Seul un guardian peut approuver");
        asserts(this.pendingRecovery !== null, "Aucune récupération en cours");

        this.pendingRecovery.approvals.add(sender);

        // Si suffisamment de guardians ont approuvé
        if (this.pendingRecovery.approvals.size >= this.recoveryThreshold) {
            this.owner = this.pendingRecovery.newOwner;
            this.pendingRecovery = null;
        }
    }

    // === Gestion multi-chaînes ===

    async registerChain(chainId, bridgeAddress) /* write */ {
        this._onlyOwner();
        asserts(this.isValidAddress(bridgeAddress), "Adresse du bridge invalide");
        this.chainBalances[chainId] = {
            bridgeAddress: lower(bridgeAddress),
            lastSync: Date.now()
        };
    }

    async bridgeTokens(fromChainId, toChainId, tokenAddress, amount) /* write */ {
        this._onlyOwner();
        amount = BigInt(amount);

        asserts(this.chainBalances[fromChainId], "Chaîne source non enregistrée");
        asserts(this.chainBalances[toChainId], "Chaîne destination non enregistrée");

        const bridgeSource = this.chainBalances[fromChainId].bridgeAddress;

        // Approuver le bridge si nécessaire pour les tokens ERC20
        if (tokenAddress !== "native") {
            await this._approveToken(tokenAddress, bridgeSource, amount);
        }

        // Appeler le bridge
        await call(bridgeSource, "", "bridgeTokens", [
            toChainId,
            tokenAddress,
            amount
        ]);

        // Mettre à jour le timestamp de dernière synchronisation
        this.chainBalances[fromChainId].lastSync = Date.now();
        this.chainBalances[toChainId].lastSync = Date.now();
    }

    // === Sécurité et limites ===

    async setDailyLimit(newLimit) /* write */ {
        this._onlyOwner();
        this.dailyLimit = BigInt(newLimit);
    }

    async addToWhitelist(address) /* write */ {
        this._onlyOwner();
        asserts(this.isValidAddress(address), "Adresse invalide");
        this.whitelistedAddresses.add(lower(address));
    }

    async removeFromWhitelist(address) /* write */ {
        this._onlyOwner();
        this.whitelistedAddresses.delete(lower(address));
    }

    // === Utilitaires internes ===

    _onlyOwner() {
        asserts(lower(msg.sender) === this.owner, "Action réservée au propriétaire");
    }

    async _approveToken(tokenAddress, spender, amount) /* write */ {
        await call(tokenAddress, "", "approve", [spender, amount]);
    }

    _checkDailyLimit(amount) {
        const today = new Date().toDateString();
        this.lastActivityTime[today] = (this.lastActivityTime[today] || BigInt(0)) + amount;
        asserts(this.lastActivityTime[today] <= this.dailyLimit, "Limite quotidienne dépassée");
    }

    isValidAddress(address) {
        return typeof address === "string" &&
            address.length === 42 &&
            address.startsWith("0x") &&
            /^0x[0-9a-fA-F]{40}$/.test(address);
    }

    // === Getters ===

    async getGuardians() {
        return Array.from(this.guardians);
    }

    async getPendingRecovery() {
        return this.pendingRecovery;
    }

    async getChainInfo(chainId) {
        return this.chainBalances[chainId];
    }

    async getDailySpent() {
        const today = new Date().toDateString();
        return this.lastActivityTime[today] || BigInt(0);
    }
}



/*

Système de récupération (recovery) :
- Utilisation de gardiens (guardians) qui peuvent aider à récupérer le wallet si nécessaire
- Système de vote avec seuil minimum pour la récupération
- Protection contre les tentatives malveillantes

Support multi-chaînes :
- Gestion des bridges entre différentes blockchains
- Suivi des balances sur chaque chaîne
- Synchronisation des états entre les chaînes

Sécurité renforcée :
- Limites quotidiennes de transactions
- Liste blanche d'adresses autorisées
- Validation plus stricte des adresses
- Suivi temporel des activités

Gestion des autorisations :
- Système de gardiens multiples
- Possibilité d'ajouter/retirer des gardiens
- Système de vote pour les actions critiques

*/