// 0xcontract_token_1.js



class ContractToken1 {

    #name = "Token de Test";
    #symbol = "TOK";
    #decimals = 9;

    #memory = memory({
        supply: 10_000_000_000n * BigInt(Math.pow(10, this.#decimals)),
        accounts: { '0x0000000000000000000000000000000000000010': 10_000_000_000n * BigInt(Math.pow(10, this.#decimals)) },
    });


    #mint(_address, amount) {
        this.#memory.supply += amount;

        this.#memory.accounts[_address] = this.#memory.accounts[_address] ?? 0n;
        this.#memory.accounts[_address] += amount;
    }

    #burn(_address, amount) {
        asserts(this.#memory.supply >= amount, `insufficient token supply : ${this.#memory.supply} < ${amount}`);
        asserts(this.#memory.accounts, 'unknown account');
        asserts(this.#memory.accounts[_address] >= amount, `insufficient token balance : ${this.#memory.accounts[_address]} < ${amount}`);
        this.#memory.accounts[_address] -= amount;
        this.#memory.supply -= amount;
    }

    transfer(recipient, amount) {
        this.#burn(caller, amount);
        this.#mint(recipient, amount);
    }


    getCoinsBalance() {
        log('DEBUG getCoinsBalance: START')

        const coinsBalance = balance(address);

        log('DEBUG getCoinsBalance: END')

        return coinsBalance;
    }


    getTokenPrice() {
        log('DEBUG getTokenPrice: START')

        const coinsBalance = balance(address);

        const tokensPrice = coinsBalance / this.#memory.supply;
        log('tokensPrice', tokensPrice)

        log('DEBUG getTokenPrice: END')

        return tokensPrice;
    }

}

