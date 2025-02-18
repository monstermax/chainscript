// NFTLoanMarket.js


class NFTLoanMarket {
    constructor() {
        this.loans = new Map(); // ID -> Loan
        this.offers = new Map(); // NFT Address + ID -> Offers
        this.nftPriceOracle = null; // Pour estimation des valeurs
        this.liquidationThreshold = 0.75; // Ratio de liquidation
        this.interestRate = 0.1; // 10% annuel
        this.minLoanDuration = 7 * 24 * 60 * 60; // 1 semaine
        this.maxLoanDuration = 365 * 24 * 60 * 60; // 1 an
    }


    // === Gestion des prêts ===

    async createLoanOffer(nftAddress, nftId, amount, duration) /* write */ {
        const sender = lower(msg.sender);
        amount = BigInt(amount);

        asserts(this.isValidAddress(nftAddress), "Adresse NFT invalide");
        asserts(duration >= this.minLoanDuration && duration <= this.maxLoanDuration,
            "Durée de prêt invalide");
        asserts(amount > 0n, "Montant invalide");

        // Vérifier la valeur estimée du NFT
        const estimatedValue = await this.#getNFTValue(nftAddress, nftId);
        asserts(amount <= estimatedValue * BigInt(this.liquidationThreshold),
            "Montant trop élevé par rapport à la valeur du NFT");

        const offer = new LoanOffer(
            sender,
            nftAddress,
            nftId,
            amount,
            duration,
            this.interestRate
        );

        const offerId = this.#generateOfferId(nftAddress, nftId, sender);
        this.offers.set(offerId, offer);

        this._emitEvent("NewLoanOffer", {
            offerId,
            lender: sender,
            nftAddress,
            nftId,
            amount,
            duration
        });
    }

    async acceptLoanOffer(offerId) /* write */ {
        const sender = lower(msg.sender);
        const offer = this.offers.get(offerId);
        asserts(offer && offer.status === "OPEN", "Offre invalide ou fermée");

        // Transférer le NFT en collatéral
        await this.#transferNFT(
            offer.nftAddress,
            sender,
            self,
            offer.nftId
        );

        // Créer le prêt
        const loan = new Loan(
            this.#generateLoanId(),
            sender,
            offer.nftAddress,
            offer.nftId,
            offer.amount,
            Date.now(),
            offer.duration
        );

        this.loans.set(loan.id, loan);
        offer.status = "ACCEPTED";

        // Transférer les fonds au borrower
        await transfer(sender, offer.amount);

        this._emitEvent("LoanStarted", {
            loanId: loan.id,
            borrower: sender,
            lender: offer.lender,
            amount: offer.amount
        });
    }

    async repayLoan(loanId) /* write */ {
        const sender = lower(msg.sender);
        const loan = this.loans.get(loanId);
        asserts(loan && loan.status === "ACTIVE", "Prêt invalide ou inactif");
        asserts(loan.borrower === sender, "Seul l'emprunteur peut rembourser");

        // Calculer le montant total dû
        this.#updateInterest(loan);
        const totalDue = loan.amount + loan.interestAccrued;

        // Vérifier que l'utilisateur a envoyé assez de fonds
        asserts(message.value >= totalDue, "Montant insuffisant pour le remboursement");

        // Rembourser le prêteur
        await transfer(loan.lender, totalDue);

        // Retourner le NFT
        await this.#transferNFT(
            loan.nftAddress,
            self,
            loan.borrower,
            loan.nftId
        );

        loan.status = "REPAID";

        this._emitEvent("LoanRepaid", {
            loanId,
            amount: totalDue
        });
    }

    async liquidateLoan(loanId) /* write */ {
        const loan = this.loans.get(loanId);
        asserts(loan && loan.status === "ACTIVE", "Prêt invalide ou inactif");

        // Vérifier si le prêt peut être liquidé
        const canLiquidate = await this.#checkLiquidation(loan);
        asserts(canLiquidate, "Conditions de liquidation non remplies");

        // Transférer le NFT au liquidateur
        await this.#transferNFT(
            loan.nftAddress,
            self,
            msg.sender,
            loan.nftId
        );

        loan.status = "LIQUIDATED";

        this._emitEvent("LoanLiquidated", {
            loanId,
            liquidator: msg.sender
        });
    }

    // === Fonctions internes ===

    async #updateInterest(loan) {
        const timeElapsed = Date.now() - loan.lastInterestUpdate;
        const interestDelta = (loan.amount * BigInt(timeElapsed) * BigInt(this.interestRate)) / BigInt(365 * 24 * 60 * 60);
        loan.interestAccrued += interestDelta;
        loan.lastInterestUpdate = Date.now();
    }

    async #checkLiquidation(loan) {
        // Vérifier si le prêt est en retard
        if (Date.now() > loan.startTime + loan.duration) {
            return true;
        }

        // Vérifier le ratio de collatéral
        const nftValue = await this.#getNFTValue(loan.nftAddress, loan.nftId);
        this.#updateInterest(loan);
        const totalDebt = loan.amount + loan.interestAccrued;

        return nftValue * BigInt(this.liquidationThreshold) < totalDebt;
    }

    async #getNFTValue(nftAddress, nftId) {
        // Appel à l'oracle de prix
        return await call(this.nftPriceOracle, "", "getNFTPrice", [nftAddress, nftId]);
    }

    #transferNFT(nftAddress, from, to, tokenId) {
        return call(nftAddress, "", "transferFrom", [from, to, tokenId]);
    }

    #generateOfferId(nftAddress, nftId, lender) {
        return keccak256(encode(["address", "uint256", "address"], [nftAddress, nftId, lender]));
    }

    #generateLoanId() {
        return keccak256(encode(["uint256"], [Date.now()]));
    }

    // === Getters ===

    async getLoan(loanId) {
        return this.loans.get(loanId);
    }

    async getLoanOffer(offerId) {
        return this.offers.get(offerId);
    }

    async getActiveLoans() {
        return Array.from(this.loans.values())
            .filter(loan => loan.status === "ACTIVE");
    }
}



// === Structures de données ===

class Loan {
    constructor(id, borrower, nftAddress, nftId, amount, startTime, duration) {
        this.id = id;
        this.borrower = borrower;
        this.nftAddress = nftAddress;
        this.nftId = nftId;
        this.amount = BigInt(amount);
        this.startTime = startTime;
        this.duration = duration;
        this.interestAccrued = 0n;
        this.status = "ACTIVE"; // ACTIVE, REPAID, LIQUIDATED
        this.lastInterestUpdate = startTime;
    }
}

class LoanOffer {
    constructor(lender, nftAddress, nftId, amount, duration, interestRate) {
        this.lender = lender;
        this.nftAddress = nftAddress;
        this.nftId = nftId;
        this.amount = BigInt(amount);
        this.duration = duration;
        this.interestRate = interestRate;
        this.status = "OPEN";
    }
}





/*

Ce contrat implémente un marché de prêts avec des NFTs comme collatéral.

Voici les principales fonctionnalités :

Système d'offres de prêt :
- Les prêteurs peuvent créer des offres pour des NFTs spécifiques
- Montants et durées personnalisables
- Validation des offres basée sur la valeur estimée du NFT


Gestion des prêts :
- Création de prêts à partir des offres acceptées
- Calcul d'intérêts en temps réel
- Système de remboursement
- Mécanisme de liquidation automatique


Protection et sécurité :
- Oracle de prix pour estimer la valeur des NFTs
- Seuils de liquidation configurables
- Durées minimum et maximum des prêts
- Vérification des ratios de collatéral


Fonctionnalités avancées :
- Suivi des intérêts accumulés
- Système d'événements pour le suivi des actions
- Gestion des transferts de NFTs
- Statuts multiples pour les prêts et les offres

*/