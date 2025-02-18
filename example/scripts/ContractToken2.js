// ContractToken2.js


class ContractToken2 {
    // Main config
    name = 'BitScript';
    symbol = 'BIS';
    owner = "0x";

    // Supply config
    decimals = 8;
    supply = 21_000_000n * this.fulltoken;

    // Accounts & Allowances
    accounts = {};
    allowances = {};


    constructor(name, symbol) {
        const sender = lower(msg.sender);

        this.name = name || this.name;
        this.symbol = symbol || this.symbol;

        this.owner = sender;
        this.accounts[sender] = this.supply;
    }


    get fulltoken() {
        return 10n ** BigInt(this.decimals);
    }


    #mint(address, amount) {
        this.supply += amount;
        this.accounts[address] = (this.accounts[address] ?? 0n) + amount;
    }


    #burn(address, amount) {
        asserts(this.supply >= amount, `insufficient token supply : ${this.supply} < ${amount}`);
        asserts(this.accounts[address] ?? 0n >= amount, `insufficient token balance : ${this.accounts[address]} < ${amount}`);

        this.accounts[address] -= amount;
        this.supply -= amount;
    }


    balanceOf(address) {
        return this.accounts[lower(address)] ?? 0n;
    }


    transfer(recipient, amount) /* write */ {
        // Usage:
        // await token.transfer("0x123...", "1000");

        this.#burn(lower(msg.sender), BigInt(amount));
        this.#mint(lower(recipient), BigInt(amount));
    }


    // Transfert direct (sender → recipient)
    transfer(recipient, amount) /* write */ {
        const sender = lower(msg.sender);
        recipient = lower(recipient);
        amount = BigInt(amount);

        asserts(this.accounts[sender] ?? 0n >= amount, `[ContractToken1][transferFrom] Insufficient balance`);

        this.accounts[sender] -= amount;
        this.accounts[recipient] = (this.accounts[recipient] ?? 0n) + amount;
    }


    // Autorisation d’un "spender" pour dépenser les tokens du owner
    approve(spender, amount) /* write */ {

        // Usage: 
        // 1. => await token.approve("0xPoolContract", "5000");
        // 2. => await token.transferFrom("0xUser", "0xLPContract", "5000");

        const owner = lower(msg.sender);
        spender = lower(spender);
        amount = BigInt(amount);

        this.allowances[owner] = this.allowances[owner] || {};
        this.allowances[owner][spender] = amount;
    }


    // Vérifie combien un "spender" peut dépenser depuis "owner"
    allowance(owner, spender) {
        owner = lower(owner);
        spender = lower(spender);
        return this.allowances[owner]?.[spender] ?? 0n;
    }


    // Transfert via autorisation (spender → recipient)
    transferFrom(owner, recipient, amount) /* write */ {

        // Usage: 
        // 1. => await token.approve("0xPoolContract", "5000");
        // 2. => await token.transferFrom("0xUser", "0xLPContract", "5000");

        const spender = lower(msg.sender);
        owner = lower(owner);
        recipient = lower(recipient);
        amount = BigInt(amount);

        asserts(this.accounts[owner] ?? 0n >= amount, `[ContractToken1][transferFrom] Insufficient balance for ${owner} : ${this.accounts[owner]} < ${amount}`);
        asserts(this.allowances[owner], `[ContractToken1][transferFrom] Allowance not set for ${owner}`);
        asserts(this.allowances[owner][spender] >= amount, `[ContractToken1][transferFrom] Allowance not set for ${owner} to ${spender}`);
        asserts(this.allowances[owner][spender] ?? 0n >= amount, `[ContractToken1][transferFrom] Allowance exceeded for ${owner} : ${this.allowances[owner][spender]} < ${amount}`);

        // Déduire l'allocation et les tokens du owner
        this.allowances[owner][spender] -= amount;
        this.accounts[owner] -= amount;

        // Ajouter les tokens au recipient
        this.accounts[recipient] = (this.accounts[recipient] ?? 0n) + amount;
    }

}

