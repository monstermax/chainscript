// ChainStore.tsx

// ChainStore.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractsAddresses } from "@frontend/config.client";
import { ChainStoreAbi } from "@frontend/abi/ChainStoreAbi";
import { jsonReviver } from "@frontend/utils/jsonUtils";

import { callSmartContract, executeSmartContract } from "@frontend/utils/contractUtils";
import ConnectWallet from "@frontend/components/Web3/ConnectWallet";

import type { AccountAddress } from "@backend/types/account.types";


interface Collection {
    collectionId: string;
    name: string;
    description: string;
    products: Product[];
}


interface Product {
    productId: string;
    name: string;
    description: string;
    price: bigint;
    stock: number;
    collectionId: string;
}


const ChainStoreAddress = contractsAddresses.dApps.ChainStore as AccountAddress;


const ChainStore: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<AccountAddress | null>(null);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(false);

    // Formulaires pour les nouvelles collections/produits
    const [newCollection, setNewCollection] = useState({
        id: "",
        name: "",
        description: ""
    });

    const [newProduct, setNewProduct] = useState({
        collectionId: "",
        id: "",
        name: "",
        description: "",
        price: "",
        stock: ""
    });

    // Quantité pour l'achat
    const [purchaseAmount, setPurchaseAmount] = useState<{ [productId: string]: bigint }>({});

    useEffect(() => {
        fetchCollections();
    }, [walletAddress]);

    const fetchCollections = async () => {
        if (!walletAddress || !window.ethereum) return;

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            // Récupérer toutes les collections
            const collectionsResult = await callSmartContract(
                provider, 
                ChainStoreAddress, 
                ChainStoreAbi, 
                "getCollections",
                []
            );

            const collections = Object.entries(JSON.parse(collectionsResult, jsonReviver))
                .map(async ([id, col]: [string, any]) => {
                    const collectionInfo = await callSmartContract(
                        provider,
                        ChainStoreAddress,
                        ChainStoreAbi,
                        "getCollectionInfo",
                        [id]
                    );
                    return JSON.parse(collectionInfo, jsonReviver);
                });

            const resolvedCollections = await Promise.all(collections);
            setCollections(resolvedCollections);

        } catch (error) {
            console.error("Erreur lors du chargement des collections :", error);
        } finally {
            setLoading(false);
        }
    };

    const registerCollection = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!newCollection.id.trim() || !newCollection.name.trim() || !newCollection.description.trim()) {
            return alert("Veuillez remplir tous les champs");
        }

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            await executeSmartContract(
                provider,
                ChainStoreAddress,
                ChainStoreAbi,
                "registerCollection",
                [newCollection.id, newCollection.name, newCollection.description]
            );

            setNewCollection({ id: "", name: "", description: "" });
            fetchCollections();

        } catch (error) {
            console.error("Erreur lors de l'enregistrement de la collection :", error);
        } finally {
            setLoading(false);
        }
    };

    const registerProduct = async () => {
        if (!walletAddress || !window.ethereum) return;
        if (!newProduct.collectionId.trim() || !newProduct.id.trim() || !newProduct.name.trim() ||
            !newProduct.description.trim() || !newProduct.price.trim() || !newProduct.stock.trim()) {
            return alert("Veuillez remplir tous les champs");
        }

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            await executeSmartContract(
                provider,
                ChainStoreAddress,
                ChainStoreAbi,
                "registerProduct",
                [
                    newProduct.collectionId,
                    newProduct.id,
                    newProduct.name,
                    newProduct.description,
                    newProduct.price,
                    newProduct.stock
                ]
            );

            setNewProduct({
                collectionId: "",
                id: "",
                name: "",
                description: "",
                price: "",
                stock: ""
            });
            fetchCollections();

        } catch (error) {
            console.error("Erreur lors de l'enregistrement du produit :", error);

        } finally {
            setLoading(false);
        }
    };

    const buyProduct = async (productId: string, price: bigint) => {
        if (!walletAddress || !window.ethereum) return;
        const amount = purchaseAmount[productId];
        if (!amount || amount <= 0n) {
            return alert("Veuillez entrer une quantité valide");
        }

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);

            await executeSmartContract(
                provider,
                ChainStoreAddress,
                ChainStoreAbi,
                "buyProduct",
                [productId, amount.toString()]
                , amount * price
            );

            setPurchaseAmount({ ...purchaseAmount, [productId]: 0n });
            fetchCollections();

        } catch (error) {
            console.error("Erreur lors de l'achat du produit :", error);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-3">🛍️ ChainStore - Boutique Décentralisée</h2>

            <ConnectWallet onConnect={setWalletAddress} />

            {/* Création d'une collection */}
            <div className="card p-3 mb-3">
                <h5>📁 Créer une collection</h5>

                <input
                    className="form-control mb-2"
                    placeholder="ID de la collection"
                    value={newCollection.id}
                    onChange={(e) => setNewCollection({ ...newCollection, id: e.target.value })}
                />

                <input
                    className="form-control mb-2"
                    placeholder="Nom de la collection"
                    value={newCollection.name}
                    onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                />

                <textarea
                    className="form-control mb-2"
                    placeholder="Description de la collection"
                    value={newCollection.description}
                    onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                ></textarea>

                <button 
                    className="btn btn-primary w-100" 
                    onClick={registerCollection} 
                    disabled={loading || !walletAddress}
                >
                    {loading ? "⏳ Création..." : "📁 Créer la collection"}
                </button>
            </div>

            {/* Création d'un produit */}
            <div className="card p-3 mb-3">
                <h5>📦 Ajouter un produit</h5>

                <select
                    className="form-control mb-2"
                    value={newProduct.collectionId}
                    onChange={(e) => setNewProduct({ ...newProduct, collectionId: e.target.value })}
                >
                    <option value="">Sélectionner une collection</option>
                    {collections.map((col) => (
                        <option key={col.collectionId} value={col.collectionId}>
                            {col.name}
                        </option>
                    ))}
                </select>

                <input
                    className="form-control mb-2"
                    placeholder="ID du produit"
                    value={newProduct.id}
                    onChange={(e) => setNewProduct({ ...newProduct, id: e.target.value })}
                />

                <input
                    className="form-control mb-2"
                    placeholder="Nom du produit"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />

                <textarea
                    className="form-control mb-2"
                    placeholder="Description du produit"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                ></textarea>

                <input
                    className="form-control mb-2"
                    placeholder="Prix (en wei)"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                />

                <input
                    className="form-control mb-2"
                    placeholder="Stock"
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                />

                <button 
                    className="btn btn-success w-100" 
                    onClick={registerProduct} 
                    disabled={loading || !walletAddress}
                >
                    {loading ? "⏳ Ajout..." : "📦 Ajouter le produit"}
                </button>
            </div>

            {/* Liste des collections et produits */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h4 className="mb-0">🏪 Catalogue</h4>

                <button 
                    className="btn btn-outline-secondary btn-sm" 
                    onClick={fetchCollections} 
                    disabled={!walletAddress}
                    title="Rafraîchir"
                >
                    🔄
                </button>
            </div>

            {collections.map((collection) => (
                <div key={collection.collectionId} className="card mb-3">
                    <div className="card-header">
                        <h5 className="mb-0">{collection.name}</h5>
                        <small className="text-muted">{collection.description}</small>
                    </div>

                    <div className="card-body">
                        <div className="row">
                            {collection.products.map((product) => (
                                <div key={product.productId} className="col-md-4 mb-3">
                                    <div className="card h-100">
                                        <div className="card-body">
                                            <h6 className="card-title">{product.name}</h6>
                                            <p className="card-text">{product.description}</p>
                                            <p className="mb-1">
                                                Prix: {ethers.formatEther(product.price)} ETH
                                            </p>
                                            <p className="mb-3">
                                                Stock: {product.stock}
                                            </p>

                                            <div className="input-group mb-2">
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="Quantité"
                                                    value={purchaseAmount[product.productId]?.toString() || ""}
                                                    onChange={(e) => setPurchaseAmount({
                                                        ...purchaseAmount,
                                                        [product.productId]: BigInt(e.target.value)
                                                    })}
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => buyProduct(product.productId, product.price)}
                                                    disabled={loading || !walletAddress || 
                                                             !purchaseAmount[product.productId] ||
                                                             product.stock <= 0}
                                                >
                                                    {loading ? "⏳" : "🛒"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


export default ChainStore;
