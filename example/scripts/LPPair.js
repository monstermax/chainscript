// LPPair.js

// non testé. merci chatgpt


class LPPair {
    #memory = memory({
        tokenA: null,
        tokenB: null,
        reservesA: 0n,
        reservesB: 0n,
        totalLiquidity: 0n,
        liquidityBalances: {},
        feePercent: 3n, // 0.3% (3 / 1000)
    });

    constructor(tokenA, tokenB) /* write */ {
        asserts(tokenA !== tokenB, "Les tokens doivent être différents");
        this.#memory.tokenA = tokenA;
        this.#memory.tokenB = tokenB;
    }

    addLiquidity(amountA, amountB) /* write */ {
        asserts(amountA > 0n && amountB > 0n, "Montants invalides");

        // 🔹 Vérifier si les tokens existent
        asserts(this.#memory.tokenA && this.#memory.tokenB, "Paire non initialisée");

        // 🔹 Vérifier que l'utilisateur a assez de tokens
        const balanceA = call(this.#memory.tokenA, "Token", "balanceOf", [caller]);
        const balanceB = call(this.#memory.tokenB, "Token", "balanceOf", [caller]);

        asserts(balanceA >= amountA, "Solde insuffisant du tokenA");
        asserts(balanceB >= amountB, "Solde insuffisant du tokenB");

        // 🔹 Vérifier que l'utilisateur a approuvé l'utilisation des tokens
        const allowanceA = call(this.#memory.tokenA, "Token", "allowance", [caller, address]);
        const allowanceB = call(this.#memory.tokenB, "Token", "allowance", [caller, address]);

        asserts(allowanceA >= amountA, "Autorisation insuffisante pour tokenA");
        asserts(allowanceB >= amountB, "Autorisation insuffisante pour tokenB");

        // 🔹 Effectuer le transfert des tokens vers la LP pair (depuis caller)
        call(this.#memory.tokenA, "Token", "transferFrom", [caller, address, amountA]);
        call(this.#memory.tokenB, "Token", "transferFrom", [caller, address, amountB]);

        // 🔹 Cas 1 : Création du pool
        if (this.#memory.totalLiquidity === 0n) {
            this.#memory.reservesA = BigInt(amountA);
            this.#memory.reservesB = BigInt(amountB);

            const liquidity = BigInt(Math.sqrt(Number(amountA) * Number(amountB)));

            this.#memory.liquidityBalances[caller] = liquidity;
            this.#memory.totalLiquidity = liquidity;

            return liquidity;
        }

        // 🔹 Cas 2 : Ajout de liquidité à un pool existant
        const optimalAmountB = (BigInt(amountA) * this.#memory.reservesB) / this.#memory.reservesA;
        asserts(amountB >= optimalAmountB, "Déséquilibre de la paire");

        const liquidity = (BigInt(amountA) * this.#memory.totalLiquidity) / this.#memory.reservesA;

        // 🔹 Mise à jour des réserves
        this.#memory.reservesA += BigInt(amountA);
        this.#memory.reservesB += BigInt(amountB);
        this.#memory.liquidityBalances[caller] = (this.#memory.liquidityBalances[caller] || 0n) + liquidity;
        this.#memory.totalLiquidity += liquidity;

        return liquidity;
    }


    removeLiquidity(liquidityAmount) /* write */ {
        asserts(liquidityAmount > 0n, "Montant invalide");
        asserts(this.#memory.liquidityBalances[caller] >= liquidityAmount, "Fonds insuffisants");

        // 🔹 Calcul de la part des réserves à retirer
        const amountA = (liquidityAmount * this.#memory.reservesA) / this.#memory.totalLiquidity;
        const amountB = (liquidityAmount * this.#memory.reservesB) / this.#memory.totalLiquidity;

        // 🔹 Mise à jour des réserves et des LP tokens
        this.#memory.reservesA -= amountA;
        this.#memory.reservesB -= amountB;
        this.#memory.totalLiquidity -= liquidityAmount;
        this.#memory.liquidityBalances[caller] -= liquidityAmount;

        // 🔹 Transférer les tokens directement à l'utilisateur
        call(this.#memory.tokenA, "Token", "transfer", [caller, amountA]);
        call(this.#memory.tokenB, "Token", "transfer", [caller, amountB]);

        return { amountA, amountB };
    }



    getAmountOut(amountIn, reserveIn, reserveOut) {
        asserts(amountIn > 0n, "Insufficient input amount");
        asserts(reserveIn > 0n && reserveOut > 0n, "Insufficient liquidity");

        const feePercent = this.#memory.feePercent; // Récupère le fee depuis la mémoire (ex: 3 = 0.3%)
        const feeDenominator = 1000n;

        const amountInWithFee = amountIn * (feeDenominator - feePercent) / feeDenominator;
        const numerator = amountInWithFee * reserveOut;
        const denominator = reserveIn + amountInWithFee;

        return numerator / denominator;
    }

    swap(tokenIn, amountIn) /* write */ {
        // Vérifier que la paire supporte ce token
        asserts(tokenIn === this.#memory.tokenA || tokenIn === this.#memory.tokenB, "Token invalide");

        // Récupérer les réserves
        const isTokenA = tokenIn === this.#memory.tokenA;
        const reserveIn = isTokenA ? this.#memory.reservesA : this.#memory.reservesB;
        const reserveOut = isTokenA ? this.#memory.reservesB : this.#memory.reservesA;

        // Calcul du montant de sortie avec `getAmountOut`
        const amountOut = this.getAmountOut(amountIn, reserveIn, reserveOut);
        asserts(amountOut > 0n, "Montant de sortie invalide");

        // Mise à jour des réserves
        if (isTokenA) {
            this.#memory.reservesA += amountIn;
            this.#memory.reservesB -= amountOut;
        } else {
            this.#memory.reservesB += amountIn;
            this.#memory.reservesA -= amountOut;
        }

        return amountOut; // 🔥 Retourne le montant reçu
    }


    getReserves() {
        return {
            tokenA: this.#memory.tokenA,
            tokenB: this.#memory.tokenB,
            reservesA: this.#memory.reservesA,
            reservesB: this.#memory.reservesB,
            totalLiquidity: this.#memory.totalLiquidity
        };
    }
}

