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

        // Enregistre les nouveaux montants dans le pool
        this.#memory.reservesA += BigInt(amountA);
        this.#memory.reservesB += BigInt(amountB);

        // Émet des LP tokens (proportionnel aux réserves)
        const liquidity = BigInt(Math.sqrt(Number(amountA) * Number(amountB)));

        this.#memory.liquidityBalances[caller] = (this.#memory.liquidityBalances[caller] || 0n) + liquidity;
        this.#memory.totalLiquidity += liquidity;
    }

    removeLiquidity(lpAmount) /* write */ {
        asserts(this.#memory.liquidityBalances[caller] >= lpAmount, "Montant LP insuffisant");

        const proportion = lpAmount * 1000n / this.#memory.totalLiquidity;
        const amountA = (this.#memory.reservesA * proportion) / 1000n;
        const amountB = (this.#memory.reservesB * proportion) / 1000n;

        // Mise à jour des réserves
        this.#memory.reservesA -= amountA;
        this.#memory.reservesB -= amountB;
        this.#memory.totalLiquidity -= lpAmount;
        this.#memory.liquidityBalances[caller] -= lpAmount;

        return { amountA, amountB };
    }

    swap(tokenIn, amountIn) /* write */ {
        asserts(tokenIn === this.#memory.tokenA || tokenIn === this.#memory.tokenB, "Token invalide");

        const isAtoB = tokenIn === this.#memory.tokenA;
        const reserveIn = isAtoB ? this.#memory.reservesA : this.#memory.reservesB;
        const reserveOut = isAtoB ? this.#memory.reservesB : this.#memory.reservesA;

        // Applique les frais de 0,3%
        const amountInWithFee = (BigInt(amountIn) * (1000n - this.#memory.feePercent)) / 1000n;
        const amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);

        asserts(amountOut > 0n, "Montant de sortie insuffisant");

        // Mise à jour des réserves
        if (isAtoB) {
            this.#memory.reservesA += BigInt(amountIn);
            this.#memory.reservesB -= amountOut;
        } else {
            this.#memory.reservesB += BigInt(amountIn);
            this.#memory.reservesA -= amountOut;
        }

        return amountOut;
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

