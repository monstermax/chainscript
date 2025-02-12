// ContractToken1.js


class ContractToken1 {

    #memory = memory({
        supply: 10_000_000_000n * this.fulltoken,
        accounts: {
            [this.owner.toLowerCase()]: 10_000_000_000n * this.fulltoken,
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
        return BigInt(Math.pow(10, this.decimals));
    }

    #mint(_address, amount) {
        this.#memory.supply += amount;

        this.#memory.accounts[_address] = this.#memory.accounts[_address] ?? 0n;
        this.#memory.accounts[_address] += amount;
    }

    #burn(_address, amount) {
        asserts(this.#memory.supply >= amount, `insufficient token supply : ${this.#memory.supply} < ${amount}`);
        asserts(this.#memory.accounts[_address], `unknown account "${_address}"`);
        asserts(this.#memory.accounts[_address] >= amount, `insufficient token balance : ${this.#memory.accounts[_address]} < ${amount}`);
        this.#memory.accounts[_address] -= amount;
        this.#memory.supply -= amount;
    }

    balanceOf(_address) {
        _address = _address.toLowerCase();
        return this.#memory.accounts[_address] ?? 0n;
    }

    transfer(recipient, amount) /* write */ {
        this.#burn(caller.toLowerCase(), BigInt(amount));
        this.#mint(recipient.toLowerCase(), BigInt(amount));
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

