// NFTToken.js

// A tester/debuger


class NFTToken {
    name = "ChainScript NFT";
    symbol = "CSNFT";
    totalSupply = 0n;
    owners = {}; // Mapping tokenId => owner
    balances = {}; // Mapping address => number of NFTs
    approvals = {}; // Mapping tokenId => approved address


    constructor(name, symbol) {
        this.name = name || this.name;
        this.symbol = symbol || this.symbol;
    }


    ownerOf(tokenId) {

        // Usage:
        // Vérifier le propriétaire d’un NFT : call(contractAddress, "NFTToken", "ownerOf", ["1"]);

        asserts(this.owners[tokenId], `Token ${tokenId} n'existe pas`);
        return this.owners[tokenId];
    }


    balanceOf(owner) {
        return this.balances[lower(owner)] ?? 0n;
    }


    mint(to, tokenId) /* write */ {

        // Usage:
        // Mint un NFT : call(contractAddress, "NFTToken", "mint", ["0x123...", "1"]);

        asserts(!this.owners[tokenId], `Token ${tokenId} existe déjà`);
        asserts(to, "Adresse invalide");

        // Attribution du token
        this.owners[tokenId] = lower(to);
        this.balances[lower(to)] = (this.balances[lower(to)] ?? 0n) + 1n;
        this.totalSupply += 1n;
    }

    transferFrom(from, to, tokenId) /* write */ {

        // Usage:
        // Transférer un NFT : call(contractAddress, "NFTToken", "transferFrom", ["0x123...", "0x456...", "1"]);

        asserts(this.owners[tokenId] === lower(from), "L'expéditeur n'est pas le propriétaire");
        asserts(from === lower(msg.sender) || this.approvals[tokenId] === lower(msg.sender), "Pas d'autorisation pour ce token");

        // Transfert
        this.owners[tokenId] = lower(to);
        this.balances[lower(from)] -= 1n;
        this.balances[lower(to)] = (this.balances[lower(to)] ?? 0n) + 1n;

        // Révoquer toute approbation existante
        delete this.approvals[tokenId];
    }

    approve(approved, tokenId) /* write */ {

        // Usage:
        // Approuver une adresse pour gérer un NFT : call(contractAddress, "NFTToken", "approve", ["0x789...", "1"]);

        asserts(this.owners[tokenId] === lower(msg.sender), "Seul le propriétaire peut approuver");

        this.approvals[tokenId] = lower(approved);
    }

    getApproved(tokenId) {

        // Usage: 
        // Vérifier qui est approuvé pour un NFT : call(contractAddress, "NFTToken", "getApproved", ["1"]);

        return this.approvals[tokenId] ?? null;
    }
}


