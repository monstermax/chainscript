// ChainStore.js


class ChainStore {
    name;
    collections = {};
    products = {};


    constructor(name) {
        this.name = name || "On-Chain Shopping";
    }


    // Ajouter une nouvelle collection
    async registerCollection(collectionId, name, description) /* write */ {
        collectionId = lower(collectionId);
        name = name.trim();
        description = description.trim();

        asserts(! (collectionId in this.collections), "Collection déjà existante");

        this.collections[collectionId] = {
            name,
            description,
            products: [],
        };
    }


    // Ajouter un nouveau produit à une collection
    async registerProduct(collectionId, productId, name, description, price, stock) /* write */ {
        collectionId = lower(collectionId);
        productId = lower(productId);
        name = name.trim();
        description = description.trim();
        price = BigInt(price);
        stock = BigInt(stock);

        asserts(collectionId in this.collections, "Collection introuvable");
        asserts(! (productId in this.products), "Produit déjà existant");
        asserts(price > 0n, "Prix invalide");
        asserts(stock >= 0n, "Stock invalide");

        this.products[productId] = {
            collectionId,
            name,
            description,
            price,
            stock
        };

        this.collections[collectionId].products.push(productId);
    }


    // Acheter un produit
    async buyProduct(productId, amount) /* payable */ {
        productId = lower(productId);
        amount = BigInt(amount);

        const sender = lower(msg.sender);

        const product = this.products[productId];
        asserts(product, "Produit introuvable");
        asserts(product.stock >= amount, "Stock insuffisant");
        asserts(amount > 0n, "Quantité invalide");

        const totalCost = product.price * amount;
        asserts(msg.value === totalCost, `Montant invalide`);

        // Mettre à jour le stock
        product.stock -= amount;

        // Enregistrer l'achat
        await this._recordPurchase(sender, productId, amount);
    }


    // Enregistrer l'achat (fonction interne)
    async _recordPurchase(buyer, productId, amount) {
        // Future implémentation avec events
    }


    // Obtenir les informations d'une collection
    async getCollectionInfo(collectionId) {
        collectionId = lower(collectionId);
        asserts(collectionId in this.collections, "Collection introuvable");

        const collection = this.collections[collectionId];
        const productsInfo = [];

        for (const productId of collection.products) {
            const product = this.products[productId];

            productsInfo.push({
                productId,
                name: product.name,
                description: product.description,
                price: product.price,
                stock: product.stock
            });
        }

        return {
            collectionId,
            name: collection.name,
            description: collection.description,
            products: productsInfo
        };
    }


    // Obtenir les informations d'un produit
    getProductInfo(productId) {
        productId = lower(productId);

        const product = this.products[productId];
        asserts(product, "Produit introuvable");

        return {
            productId,
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            collectionId: product.collectionId
        };
    }


    getCollections() {
        const result = {};

        for (const [id, collection] of Object.entries(this.collections)) {

            result[id] = {
                name: collection.name,
                description: collection.description,
                products: collection.products,
            };
        }
        return result;
    }
}

