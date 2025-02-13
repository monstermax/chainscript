// NFTToken.js


class NFTToken {
    #memory = memory({
        name: "ChainScript NFT",
        symbol: "CSNFT",
        totalSupply: 0n,
        owners: {}, // Mapping tokenId => owner
        balances: {}, // Mapping address => number of NFTs
        approvals: {}, // Mapping tokenId => approved address
    });

    get name() {
        return this.#memory.name;
    }

    get symbol() {
        return this.#memory.symbol;
    }

    totalSupply() {
        return this.#memory.totalSupply;
    }

    ownerOf(tokenId) {

        // Usage:
        // Vérifier le propriétaire d’un NFT : call(contractAddress, "NFTToken", "ownerOf", ["1"]);

        asserts(this.#memory.owners[tokenId], `Token ${tokenId} n'existe pas`);
        return this.#memory.owners[tokenId];
    }

    balanceOf(owner) {
        return this.#memory.balances[lower(owner)] ?? 0n;
    }

    mint(to, tokenId) /* write */ {

        // Usage:
        // 🚀 Mint un NFT : call(contractAddress, "NFTToken", "mint", ["0x123...", "1"]);

        asserts(!this.#memory.owners[tokenId], `Token ${tokenId} existe déjà`);
        asserts(to, "Adresse invalide");

        // Attribution du token
        this.#memory.owners[tokenId] = lower(to);
        this.#memory.balances[lower(to)] = (this.#memory.balances[lower(to)] ?? 0n) + 1n;
        this.#memory.totalSupply += 1n;
    }

    transferFrom(from, to, tokenId) /* write */ {

        // Usage:
        // Transférer un NFT : call(contractAddress, "NFTToken", "transferFrom", ["0x123...", "0x456...", "1"]);

        asserts(this.#memory.owners[tokenId] === lower(from), "L'expéditeur n'est pas le propriétaire");
        asserts(from === lower(caller) || this.#memory.approvals[tokenId] === lower(caller), "Pas d'autorisation pour ce token");

        // Transfert
        this.#memory.owners[tokenId] = lower(to);
        this.#memory.balances[lower(from)] -= 1n;
        this.#memory.balances[lower(to)] = (this.#memory.balances[lower(to)] ?? 0n) + 1n;

        // Révoquer toute approbation existante
        delete this.#memory.approvals[tokenId];
    }

    approve(approved, tokenId) /* write */ {

        // Usage:
        // Approuver une adresse pour gérer un NFT : call(contractAddress, "NFTToken", "approve", ["0x789...", "1"]);

        asserts(this.#memory.owners[tokenId] === lower(caller), "Seul le propriétaire peut approuver");

        this.#memory.approvals[tokenId] = lower(approved);
    }

    getApproved(tokenId) {

        // Usage: 
        // Vérifier qui est approuvé pour un NFT : call(contractAddress, "NFTToken", "getApproved", ["1"]);

        return this.#memory.approvals[tokenId] ?? null;
    }
}


