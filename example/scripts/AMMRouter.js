// AMMRouter.js



class AMMRouter {
    pairs = {};


    registerPair(pairAddress, tokenA, tokenB) /* write */ {
        pairAddress = lower(pairAddress);
        tokenA = lower(tokenA);
        tokenB = lower(tokenB);

        this.pairs[pairAddress] = { tokenA, tokenB };
    }


    async findBestPair(tokenIn, tokenOut) {
        tokenIn = lower(tokenIn);
        tokenOut = lower(tokenOut);

        let bestPair = null;
        let bestRate = 0n;
        let bestReserves = null;

        for (const [pairAddress, { tokenA, tokenB }] of Object.entries(this.pairs)) {
            if ((tokenA === tokenIn && tokenB === tokenOut) || (tokenB === tokenIn && tokenA === tokenOut)) {
                const pair = await call(pairAddress, "LPPair", "getReserves", []);

                const reserveIn = tokenA === tokenIn ? pair.reservesA : pair.reservesB;
                const reserveOut = tokenA === tokenIn ? pair.reservesB : pair.reservesA;

                const rate = reserveOut * 1000n / reserveIn;

                if (rate > bestRate) {
                    bestRate = rate;
                    bestPair = pairAddress;
                    bestReserves = { reserveIn, reserveOut };
                }
            }
        }

        return { bestPair, bestReserves };
    }


    async swap(tokenIn, tokenOut, amountIn) /* write */ {
        tokenIn = lower(tokenIn);
        tokenOut = lower(tokenOut);
        amountIn = BigInt(amountIn);

        const sender = lower(caller); // L'utilisateur qui fait le swap

        const { bestPair } = await this.findBestPair(tokenIn, tokenOut);
        asserts(bestPair, "Aucune paire disponible");

        // Vérifier que l'utilisateur a assez de fonds et d'allocation
        const balance = await call(tokenIn, "", "balanceOf", [sender]);
        const allowance = await call(tokenIn, "", "allowance", [sender, self]); // `self` = ce Router

        asserts(balance >= amountIn, "[Router][swap] Solde insuffisant pour l'utilisateur");
        asserts(allowance >= amountIn, "[Router][swap] Allowance insuffisante pour le Router");

        // Transférer les tokens de l'utilisateur vers le Router
        await call(tokenIn, "", "transferFrom", [sender, self, amountIn]);

        // Approuver la LP Pair pour récupérer les tokens du Router
        await call(tokenIn, "", "approve", [bestPair, amountIn]);

        // Exécuter le swap sur la LP Pair (le Router agit maintenant comme sender)
        return call(bestPair, "LPPair", "swap", [tokenIn, amountIn]);
    }



    getAmountsOut(amountIn, pathList) {

        // Usage:
        // 1. Cas simple   (swap direct A → B)      => getAmountsOut(1000, ["TokenA", "TokenB"]);  // => Retourne : [1000, 980] (avec 2% de frais)
        // 2. Cas complexe (multi-paires A → B → C) => getAmountsOut(1000, ["TokenA", "TokenB", "TokenC"]); // Retourne : [1000, 980, 950]

        const path = pathList.split(',').map(address => address.trim()).filter(address => address);
        asserts(path.length >= 2, "Path invalide");

        let amounts = [amountIn];

        for (let i = 0; i < path.length - 1; i++) {
            const tokenIn = path[i];
            const tokenOut = path[i + 1];

            const pair = findPair(tokenIn, tokenOut);
            asserts(pair, "Paire introuvable");

            const amountOut = pair.getAmountOut(amounts[i]); // Utilisation de `getAmountOut` dans la paire
            amounts.push(amountOut);
        }

        return amounts;
    }


    async swapExactTokensForTokens(amountIn, amountOutMin, pathList) /* write */ {

        // Usage
        // 1. Cas simple (swap direct A → B)     => ammRouter.swapExactTokensForTokens(1000, 900, ["TokenA", "TokenB"]);
        // 2. Cas complexe (multi-hop A → B → C) => ammRouter.swapExactTokensForTokens(1000, 850, ["TokenA", "TokenB", "TokenC"]);

        amountIn = BigInt(amountIn);
        amountIn = BigInt(amountOutMin);

        const path = pathList.split(',').map(address => address.trim()).filter(address => address);
        asserts(path.length >= 2, "Path invalide");

        // 1️⃣ Calcul des montants à chaque étape
        const amounts = this.getAmountsOut(amountIn, path);
        const amountOutFinal = amounts[amounts.length - 1];

        // 2️⃣ Vérification du slippage
        asserts(amountOutFinal >= amountOutMin, "Slippage trop élevé");

        // 3️⃣ Exécution des swaps sur chaque paire du chemin
        for (let i = 0; i < path.length - 1; i++) {
            const tokenIn = path[i];
            const tokenOut = path[i + 1];

            const { bestPair } = await this.findBestPair(tokenIn, tokenOut);
            asserts(bestPair, "Paire introuvable");

            const swapAmountOut = await call(bestPair, "LPPair", "swap", [tokenIn, amounts[i]]); // ⚡ Exécution du swap
        }

        return amounts[amounts.length - 1]; // Montant final reçu
    }

}
