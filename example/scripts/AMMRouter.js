// AMMRouter.js

// non testé. merci chatgpt


class AMMRouter {
    #memory = memory({
        pairs: {},
    });

    registerPair(pairAddress, tokenA, tokenB) /* write */ {
        this.#memory.pairs[pairAddress] = { tokenA, tokenB };
    }

    findBestPair(tokenIn, tokenOut) {
        let bestPair = null;
        let bestRate = 0n;

        for (const [pairAddress, { tokenA, tokenB }] of Object.entries(this.#memory.pairs)) {
            if ((tokenA === tokenIn && tokenB === tokenOut) || (tokenB === tokenIn && tokenA === tokenOut)) {
                const pair = call(pairAddress, "LPPair", "getReserves", []);
                const reservesIn = tokenA === tokenIn ? pair.reservesA : pair.reservesB;
                const reservesOut = tokenA === tokenIn ? pair.reservesB : pair.reservesA;

                const rate = reservesOut * 1000n / reservesIn;
                if (rate > bestRate) {
                    bestRate = rate;
                    bestPair = pairAddress;
                }
            }
        }

        return bestPair;
    }

    swap(tokenIn, tokenOut, amountIn) /* write */ {
        const bestPair = this.findBestPair(tokenIn, tokenOut);
        asserts(bestPair, "Aucune paire disponible");

        return call(bestPair, "LPPair", "swap", [tokenIn, amountIn]);
    }
}
