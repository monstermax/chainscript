// ChainStore.js



class ChainStore {
    collections = {};
    products = {};


    // Ajouter une nouvelle collection
    registerCollection(collectionId, name, description) /* write */ {
        collectionId = lower(collectionId);
        name = name.trim();
        description = description.trim();

        asserts(!this.collections[collectionId], "Collection déjà existante");

        this.collections[collectionId] = {
            name,
            description,
            products: []
        };
    }

    // Ajouter un nouveau produit à une collection
    registerProduct(collectionId, productId, name, description, price, stock) /* write */ {
        collectionId = lower(collectionId);
        productId = lower(productId);
        name = name.trim();
        description = description.trim();
        price = BigInt(price);
        stock = BigInt(stock);

        asserts(this.collections[collectionId], "Collection introuvable");
        asserts(!this.products[productId], "Produit déjà existant");

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
    async buyProduct(productId, amount) /* write */ {
        productId = lower(productId);
        amount = BigInt(amount);

        const sender = lower(caller); // L'utilisateur qui achète le produit

        asserts(this.products[productId], "Produit introuvable");
        asserts(this.products[productId].stock >= amount, "Stock insuffisant");

        const totalCost = this.products[productId].price * amount;

        // Vérifier que l'utilisateur a assez de fonds
        const balance = await call("Token", "", "balanceOf", [sender]);
        asserts(balance >= totalCost, "Solde insuffisant pour acheter le produit");

        // Transférer les tokens de l'utilisateur vers le contrat
        await call("Token", "", "transferFrom", [sender, self, totalCost]);

        // Mettre à jour le stock du produit
        this.products[productId].stock -= amount;

        // Envoyer le produit à l'utilisateur (par exemple, en émettant un événement ou en enregistrant la commande)
        await this.#recordPurchase(sender, productId, amount);

        return { success: true, productId, amount };
    }

    // Enregistrer l'achat (fonction interne)
    async #recordPurchase(buyer, productId, amount) {
        // Ici, vous pouvez enregistrer l'achat dans un historique ou émettre un événement
        // Par exemple :
        // emit("ProductPurchased", { buyer, productId, amount });
    }

    // Obtenir les informations d'une collection
    async getCollectionInfo(collectionId) {
        collectionId = lower(collectionId);

        asserts(this.collections[collectionId], "Collection introuvable");

        const collection = this.collections[collectionId];

        const productsInfo = await Promise.all(collection.products.map(async productId => {
            const product = this.products[productId];
            return {
                productId,
                name: product.name,
                description: product.description,
                price: product.price.toString(),
                stock: product.stock.toString()
            };
        }));

        return {
            collectionId,
            name: collection.name,
            description: collection.description,
            products: productsInfo
        };
    }

    // Obtenir les informations d'un produit
    async getProductInfo(productId) {
        productId = lower(productId);

        asserts(this.products[productId], "Produit introuvable");

        const product = this.products[productId];

        return {
            productId,
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            stock: product.stock.toString(),
            collectionId: product.collectionId
        };
    }

    async getCollections() {
        return this.collections;
    }
}
