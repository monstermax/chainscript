// ContractToken1.js


class ContractToken1 {

    #memory = memory({
        supply: 10_000_000_000n * this.fulltoken,
        accounts: {
            [lower(this.owner)]: 10_000_000_000n * this.fulltoken,
        },
    });


    get name() {
        return 'Test Token';
    }

    get symbol() {
        return 'TOK';
    }

    get decimals() {
        return 9;
    }

    get owner() {
        return '0xee5392913a7930c233Aa711263f715f616114e9B';
    }

    get fulltoken() {
        return BigInt(10 ** this.decimals);
    }


    #mint(_address, amount) {
        this.#memory.supply += amount;
        this.#memory.accounts[_address] = (this.#memory.accounts[_address] ?? 0n) + amount;
    }


    #burn(_address, amount) {
        asserts(this.#memory.supply >= amount, `insufficient token supply : ${this.#memory.supply} < ${amount}`);
        asserts(this.#memory.accounts[_address] ?? 0n >= amount, `insufficient token balance : ${this.#memory.accounts[_address]} < ${amount}`);

        this.#memory.accounts[_address] -= amount;
        this.#memory.supply -= amount;
    }


    balanceOf(_address) {
        return this.#memory.accounts[lower(_address)] ?? 0n;
    }


    transfer(recipient, amount) /* write */ {
        this.#burn(lower(caller), BigInt(amount));
        this.#mint(lower(recipient), BigInt(amount));
    }


    // ✅ Transfert direct (sender → recipient)
    transfer(recipient, amount) /* write */ {
        const sender = lower(caller);
        recipient = lower(recipient);
        amount = BigInt(amount);

        asserts(this.#memory.accounts[sender] ?? 0n >= amount, "Insufficient balance");

        this.#memory.accounts[sender] -= amount;
        this.#memory.accounts[recipient] = (this.#memory.accounts[recipient] ?? 0n) + amount;
    }

    // ✅ Autorisation d’un "spender" pour dépenser les tokens du owner
    approve(spender, amount) /* write */ {
        const owner = lower(caller);
        spender = lower(spender);
        amount = BigInt(amount);

        this.#memory.allowances[owner] = this.#memory.allowances[owner] || {};
        this.#memory.allowances[owner][spender] = amount;
    }

    // ✅ Vérifie combien un "spender" peut dépenser depuis "owner"
    allowance(owner, spender) {
        owner = lower(owner);
        spender = lower(spender);
        return this.#memory.allowances[owner]?.[spender] ?? 0n;
    }

    // ✅ Transfert via autorisation (spender → recipient)
    transferFrom(owner, recipient, amount) /* write */ {
        const spender = lower(caller);
        owner = lower(owner);
        recipient = lower(recipient);
        amount = BigInt(amount);

        asserts(this.#memory.accounts[owner] ?? 0n >= amount, "Insufficient balance");
        asserts(this.#memory.allowances[owner]?.[spender] ?? 0n >= amount, "Allowance exceeded");

        // Déduire l'allocation et les tokens du owner
        this.#memory.allowances[owner][spender] -= amount;
        this.#memory.accounts[owner] -= amount;

        // Ajouter les tokens au recipient
        this.#memory.accounts[recipient] = (this.#memory.accounts[recipient] ?? 0n) + amount;
    }

}

