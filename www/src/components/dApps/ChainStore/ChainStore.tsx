// ChainStore.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractsAddresses, symbol } from "@frontend/config.client";
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

type ChainStoreAdminProps = {
    walletAddress: AccountAddress | null,
    loading: boolean,
    collections: Collection[],
    fetchCollections: () => Promise<void>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
}

type ChainStoreShopProps = {
    walletAddress: AccountAddress | null,
    loading: boolean,
    collections: Collection[],
    fetchCollections: () => Promise<void>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
}


const ChainStoreAddress = contractsAddresses.dApps.ChainStore as AccountAddress;


const ChainStore: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<AccountAddress | null>(null);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("shop");


    useEffect(() => {
        fetchCollections();
    }, [walletAddress]);


    //const setAmountEtherSafe = (value: string) => {
    //    const valueSafe: string | null = formatAmountEtherSafe(value);
    //    if (valueSafe === null) return;
    //    setAmountEther(valueSafe);
    //}


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


    return (
        <div className="container mt-4">
            <h2 className="mb-3">🛍️ ChainStore - Boutique Décentralisée</h2>

            <ConnectWallet onConnect={setWalletAddress} />

            <ul className="nav nav-tabs">
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === "shop" ? "active" : ""}`} onClick={() => setActiveTab("shop")}>Shop</button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === "admin" ? "active" : ""}`} onClick={() => setActiveTab("admin")}>Admin</button>
                </li>
            </ul>

            <div className="mt-3">
                {activeTab === "admin" && (
                    <ChainStoreAdmin walletAddress={walletAddress} loading={loading} collections={collections} fetchCollections={fetchCollections} setLoading={setLoading} />
                )}
                {activeTab === "shop" && (
                    <ChainStoreShop walletAddress={walletAddress} loading={loading} collections={collections} fetchCollections={fetchCollections} setLoading={setLoading} />
                )}
            </div>
        </div>
    );
};



const ChainStoreAdmin: React.FC<ChainStoreAdminProps> = (props) => {
    const walletAddress = props.walletAddress;
    const loading = props.loading;
    const collections = props.collections;
    const fetchCollections = props.fetchCollections;
    const setLoading = props.setLoading;


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


    return (
        <>
            {/* Création d'une collection */}
            <div className="card p-3 mb-3">
                <h5>📁 Créer une collection</h5>

                <div className="d-flex">
                    <input
                        className="form-control mb-2 me-2"
                        placeholder="ID de la collection"
                        value={newCollection.id}
                        onChange={(e) => setNewCollection({ ...newCollection, id: e.target.value })}
                    />

                    <input
                        className="form-control mb-2 ms-2"
                        placeholder="Nom de la collection"
                        value={newCollection.name}
                        onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                    />
                </div>

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

                <div className="d-flex">
                    <input
                        className="form-control mb-2 me-2"
                        placeholder="ID du produit"
                        value={newProduct.id}
                        onChange={(e) => setNewProduct({ ...newProduct, id: e.target.value })}
                    />

                    <input
                        className="form-control mb-2 ms-2"
                        placeholder="Nom du produit"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                </div>

                <textarea
                    className="form-control mb-2"
                    placeholder="Description du produit"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                ></textarea>

                <div className="d-flex">
                    <input
                        className="form-control mb-2 me-2"
                        placeholder="Prix (en wei)"
                        type="number"
                        min={0}
                        step={1}
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    />

                    <input
                        className="form-control mb-2 ms-2"
                        placeholder="Stock"
                        type="number"
                        min={0}
                        step={1}
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    />
                </div>

                <button 
                    className="btn btn-success w-100" 
                    onClick={registerProduct} 
                    disabled={loading || !walletAddress}
                >
                    {loading ? "⏳ Ajout..." : "📦 Ajouter le produit"}
                </button>
            </div>
        </>
    );
}



const ChainStoreShop: React.FC<ChainStoreShopProps> = (props) => {
    const { walletAddress, loading, collections, fetchCollections, setLoading } = props;

    const [selectedProduct, setSelectedProduct] = useState<{ productId: string, productName: string, price: bigint } | null>(null);
    const [purchaseAmount, setPurchaseAmount] = useState<bigint>(0n);

    const openPurchasePopup = (productId: string, productName: string, price: bigint) => {
        setSelectedProduct({ productId, productName, price });
        setPurchaseAmount(1n);
    };

    const closePurchasePopup = () => {
        setSelectedProduct(null);
        setPurchaseAmount(0n);
    };

    const buyProduct = async () => {
        if (!walletAddress || !window.ethereum || !selectedProduct) return;
        if (!purchaseAmount || purchaseAmount <= 0n) {
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
                [selectedProduct.productId, purchaseAmount.toString()],
                purchaseAmount * selectedProduct.price
            );

            closePurchasePopup();
            fetchCollections();

        } catch (error) {
            console.error("Erreur lors de l'achat du produit :", error);

        } finally {
            setLoading(false);
        }
    };

    return (
        <>
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
                                            <p className="mb-1">Prix: {ethers.formatEther(product.price)} {symbol}</p>
                                            <p className="mb-3">Stock: {product.stock}</p>

                                            <button 
                                                className="btn btn-primary w-100"
                                                onClick={() => openPurchasePopup(product.productId, product.name, product.price)}
                                                disabled={loading || !walletAddress || product.stock <= 0}
                                            >
                                                Acheter
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}

            {/* Popup d'achat */}
            {selectedProduct && (
                <div className="modal fade show d-block" tabIndex={-1} role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Acheter un produit</h5>

                                <button type="button" className="btn-close" onClick={closePurchasePopup}></button>
                            </div>

                            <div className="modal-body">
                                <h3>{selectedProduct.productName}</h3>

                                <label>Quantité :</label>

                                <input 
                                    type="number"
                                    min={0} 
                                    step={1}
                                    className="form-control"
                                    value={purchaseAmount.toString()}
                                    onChange={(e) => setPurchaseAmount(BigInt(e.target.value) > 0n ? BigInt(e.target.value) : 0n)}
                                />
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closePurchasePopup}>Annuler</button>

                                <button type="button" className="btn btn-primary" onClick={buyProduct}>
                                    Confirmer l'achat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};



export default ChainStore;
