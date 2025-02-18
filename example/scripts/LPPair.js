// LPPair.js


class LPPair {
    tokenA = null;
    tokenB = null;
    reservesA = 0n;
    reservesB = 0n;
    totalLiquidity = 0n;
    liquidityBalances = {};
    feePercent = 3n; // 0.3% (3 / 1000)


    constructor(tokenA, tokenB) /* write */ {
        tokenA = lower(tokenA);
        tokenB = lower(tokenB);

        asserts(tokenA, "tokenA non fourni");
        asserts(tokenB, "tokenB non fourni");
        asserts(tokenA !== tokenB, "Les tokens doivent être différents");

        this.tokenA = tokenA;
        this.tokenB = tokenB;
    }


    async addLiquidity(amountA, amountB) /* write */ {
        const sender = lower(msg.sender);
        amountA = BigInt(amountA);
        amountB = BigInt(amountB);

        //log(`[addLiquidity] 🔹 Début - Sender: ${sender}, amountA: ${amountA}, amountB: ${amountB}`);

        asserts(amountA > 0n && amountB > 0n, "Montants invalides");

        // Vérifier si les tokens existent
        asserts(this.tokenA && this.tokenB, "Paire non initialisée");
        log(`[addLiquidity] ✅ Tokens détectés: tokenA = ${this.tokenA}, tokenB = ${this.tokenB}`);


        // Vérifier que l'utilisateur a assez de tokens
        const balanceA = await call(this.tokenA, "", "balanceOf", [sender]);
        const balanceB = await call(this.tokenB, "", "balanceOf", [sender]);
        log(`[addLiquidity] 📊 Soldes avant: balanceA = ${balanceA}, balanceB = ${balanceB}`);


        asserts(balanceA >= amountA, "Solde insuffisant du tokenA");
        asserts(balanceB >= amountB, "Solde insuffisant du tokenB");

        // Vérifier que l'utilisateur a approuvé l'utilisation des tokens
        const allowanceA = await call(this.tokenA, "", "allowance", [sender, self]);
        const allowanceB = await call(this.tokenB, "", "allowance", [sender, self]);
        log(`[addLiquidity] 🔐 Allowance: allowanceA = ${allowanceA}, allowanceB = ${allowanceB}`);


        asserts(allowanceA >= amountA, "Autorisation insuffisante pour tokenA");
        asserts(allowanceB >= amountB, "Autorisation insuffisante pour tokenB");

        // Effectuer le transfert des tokens vers la LP pair (depuis sender)
        await call(this.tokenA, "", "transferFrom", [sender, self, amountA]);
        await call(this.tokenB, "", "transferFrom", [sender, self, amountB]);
        log(`[addLiquidity] 🔄 Transfert effectué: +${amountA} tokenA, +${amountB} tokenB`);


        // 🔹 Cas 1 : Création du pool
        if (this.totalLiquidity === 0n) {
            this.reservesA = BigInt(amountA);
            this.reservesB = BigInt(amountB);

            const liquidity = BigInt(Math.round(Math.sqrt(Number(amountA) * Number(amountB))));

            this.liquidityBalances[sender] = liquidity; // aka LP Tokens
            this.totalLiquidity = liquidity;

            log(`[addLiquidity] 🚀 Pool créé ! ReservesA: ${this.reservesA}, ReservesB: ${this.reservesB}, Liquidity: ${liquidity}`);

            return liquidity;
        }


        // 🔹 Cas 2 : Ajout de liquidité à un pool existant
        const optimalAmountB = (BigInt(amountA) * this.reservesB) / this.reservesA;
        asserts(amountB >= optimalAmountB, "Déséquilibre de la paire");

        const liquidity = (BigInt(amountA) * this.totalLiquidity) / this.reservesA;

        // Mise à jour des réserves
        this.reservesA += BigInt(amountA);
        this.reservesB += BigInt(amountB);
        this.liquidityBalances[sender] = (this.liquidityBalances[sender] || 0n) + liquidity;
        this.totalLiquidity += liquidity;

        asserts(this.reservesA * this.reservesB >= (this.totalLiquidity ** 2n), "[addLiquidity] Incohérence dans les réserves et la liquidité totale");


        log(`[addLiquidity] ✅ Ajout réussi: ReservesA: ${this.reservesA}, ReservesB: ${this.reservesB}, TotalLiquidity: ${this.totalLiquidity}`);

        return liquidity;
    }


    async removeLiquidity(liquidityAmount) /* write */ {
        const sender = lower(msg.sender);
        liquidityAmount = BigInt(liquidityAmount);

        asserts(liquidityAmount > 0n, "Montant invalide");
        asserts(this.liquidityBalances[sender] >= liquidityAmount, "Fonds insuffisants");

        // Calcul de la part des réserves à retirer
        const amountA = (liquidityAmount * this.reservesA) / this.totalLiquidity;
        const amountB = (liquidityAmount * this.reservesB) / this.totalLiquidity;

        // Mise à jour des réserves et des LP tokens
        this.reservesA -= amountA;
        this.reservesB -= amountB;
        this.totalLiquidity -= liquidityAmount;
        this.liquidityBalances[sender] -= liquidityAmount;

        asserts(this.reservesA * this.reservesB >= (this.totalLiquidity ** 2n), "[addLiquidity] Incohérence dans les réserves et la liquidité totale");

        // Transférer les tokens directement à l'utilisateur
        await call(this.tokenA, "", "transfer", [sender, amountA]);
        await call(this.tokenB, "", "transfer", [sender, amountB]);

        return { amountA, amountB };
    }


    getAmountOut(amountIn, reserveIn, reserveOut) {
        amountIn = BigInt(amountIn),
        reserveIn = BigInt(reserveIn),
        reserveOut = BigInt(reserveOut),

        asserts(amountIn > 0n, "Insufficient input amount");
        asserts(reserveIn > 0n && reserveOut > 0n, "Insufficient liquidity");

        const feePercent = this.feePercent; // Récupère le fee depuis la mémoire (ex: 3 = 0.3%)
        const feeDenominator = 1000n;

        const amountInWithFee = amountIn * (feeDenominator - feePercent) / feeDenominator;
        const numerator = amountInWithFee * reserveOut;
        const denominator = reserveIn + amountInWithFee;

        return numerator / denominator;
    }


    async swap(tokenIn, amountIn) /* write */ {
        tokenIn = lower(tokenIn);
        amountIn = BigInt(amountIn);

        const sender = lower(msg.sender); // L'utilisateur qui swap

        // Vérifier que la paire supporte ce token
        asserts(tokenIn === this.tokenA || tokenIn === this.tokenB, "Token invalide");

        // Récupérer les réserves
        const isTokenA = tokenIn === this.tokenA;
        const reserveIn = isTokenA ? this.reservesA : this.reservesB;
        const reserveOut = isTokenA ? this.reservesB : this.reservesA;

        // Calcul du montant de sortie avec `getAmountOut`
        const amountOut = this.getAmountOut(amountIn, reserveIn, reserveOut);
        asserts(amountOut > 0n, "Montant de sortie invalide");

        // Étape 1 : L'utilisateur envoie `amountIn` à la LP Pair
        await call(tokenIn, "", "transferFrom", [sender, self, amountIn]); // BUG ici si on vient du routeur. alors sender=router or le router n'a pas de liquidité

        // Étape 2 : La LP Pair envoie `amountOut` à l'utilisateur
        const tokenOut = isTokenA ? this.tokenB : this.tokenA;
        await call(tokenOut, "", "transfer", [sender, amountOut]);

        // Mise à jour des réserves après le swap
        if (isTokenA) {
            this.reservesA += amountIn;
            this.reservesB -= amountOut;
        } else {
            this.reservesB += amountIn;
            this.reservesA -= amountOut;
        }

        asserts(
            this.reservesA > 0n && this.reservesB > 0n,
            "[swap] Erreur : Réserves invalides après échange"
        );

        asserts(
            this.reservesA * this.reservesB >= (this.totalLiquidity ** 2n),
            "[swap] Erreur : Ratio de liquidité incohérent après échange"
        );

        return amountOut; // Retourne le montant reçu
    }


    getReserves() {
        return {
            tokenA: this.tokenA,
            tokenB: this.tokenB,
            reservesA: this.reservesA,
            reservesB: this.reservesB,
            totalLiquidity: this.totalLiquidity
        };
    }
}

