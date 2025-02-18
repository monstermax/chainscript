// TipJar.js


class TipJar {
    owner;
    donations = [];

    constructor(owner) {
        this.owner = lower(owner || msg.sender);
    }

    // Recevoir un don
    receiveDonation() /* payable */ {
        const sender = lower(msg.sender);
        const amount = msg.value;

        this.donations.push({ sender, amount });
    }

    // Retirer les dons
    async withdrawDonations() /* write */ {
        const sender = lower(msg.sender);

        asserts(sender === this.owner, "Seul le propriétaire peut retirer les dons.");

        const totalAmount = this.donations.reduce((sum, donation) => sum + donation.amount, 0n);
        await transfer(this.owner, totalAmount);

        this.donations = []; // Réinitialiser la liste des dons
    }

    // Obtenir l'historique des dons
    getDonations() {
        return this.donations;
    }
}
