
import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, TextInput, ActivityIndicator, Alert } from "react-native";

//import { createEthWallet } from "@frontend/utils/accountsUtils";
//import { useWeb3 } from "@frontend/components/Web3Provider";


const rpcHost = "localhost"; // Remplacez par l'URL de votre serveur backend si nécessaire
const chainId = 9999999999;
const symbol = "DEV";


const Home: React.FC = () => {
    const [isAdding, setIsAdding] = useState(false);
    const [added, setAdded] = useState(false);


    const addChainToMetamask = async () => {
        setIsAdding(true);

        try {
            // Cette fonctionnalité est spécifique à MetaMask et ne fonctionne pas dans React Native
            console.warn("Ajout de chaîne non pris en charge dans React Native");
            setAdded(true);

        } catch (err: any) {
            console.warn("Échec de l'ajout de chaîne :", err.message);

        } finally {
            setIsAdding(false);
        }
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>🚀 Bienvenue sur ChainScript Explorer</Text>
            <Text style={styles.subtitle}>
                Votre portail vers une blockchain rapide, légère et modulaire.
            </Text>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>🌐 Informations sur la blockchain</Text>
                <View style={styles.infoList}>
                    <Text style={styles.infoItem}>Réseau : DEV (Localhost)</Text>
                    <Text style={styles.infoItem}>Chain ID : {chainId}</Text>
                    <Text style={styles.infoItem}>Monnaie native : {symbol}</Text>
                    <Text style={styles.infoItem}>Explorateur : http://{rpcHost}</Text>
                </View>
                <Button
                    title={isAdding ? "⏳ Ajout en cours..." : added ? "✅ Réseau ajouté" : "➕ Ajouter à Metamask"}
                    onPress={addChainToMetamask}
                    disabled={isAdding || added}
                />
            </View>
            <CreateWalletComponent />
            <FaucetComponent />
        </View>
    );
};



const CreateWalletComponent: React.FC = () => {
    const [wallet, setWallet] = useState<{ address: string; privateKey: string; mnemonic?: string } | null>(null);
    const [loading, setLoading] = useState(false);


    const createWallet = async () => {
        setLoading(true);
        try {
            const newWallet = null; //createEthWallet();
            setWallet(newWallet);

        } catch (error: any) {
            Alert.alert("Erreur", error.message);

        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>🔑 Créer un Wallet</Text>
            <Button
                title={loading ? "⏳ Création..." : "🆕 Générer un wallet"}
                onPress={createWallet}
                disabled={loading}
            />
            {wallet && (
                <View style={styles.walletInfo}>
                    <Text style={styles.walletDetail}><strong>Adresse :</strong> {wallet.address}</Text>
                    <Text style={styles.walletDetail}><strong>Clé privée :</strong> {wallet.privateKey}</Text>
                    <Text style={styles.walletDetail}><strong>Seed :</strong> {wallet.mnemonic ?? "-"}</Text>
                </View>
            )}
        </View>
    );
};



const FaucetComponent: React.FC = () => {
    const { walletAddress } = { walletAddress: '' }; //useWeb3();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [address, setAddress] = useState<string | null>(null);


    useEffect(() => {
        setAddress(walletAddress);
    }, [walletAddress]);


    const requestFaucet = async () => {
        if (!address) return;

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`http://${rpcHost}/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jsonrpc: "2.0", method: "eth_faucet", params: [address], id: 1 }),
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }
            setMessage(`Faucet envoyé à ${address}`);

        } catch (error: any) {
            setMessage(`Erreur : ${error.message}`);

        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>💧 Faucet</Text>
            <TextInput
                style={styles.input}
                placeholder="Entrez votre adresse"
                value={address ?? ""}
                onChangeText={(text) => setAddress(text)}
            />
            <Button
                title={loading ? "⏳ Demande en cours..." : "🚰 Demander des tokens"}
                onPress={requestFaucet}
                disabled={loading || !address}
            />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
};



const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        alignItems: "center",
        justifyContent: "flex-start",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
    },
    card: {
        width: "100%",
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    infoList: {
        marginBottom: 10,
    },
    infoItem: {
        fontSize: 14,
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
        width: "100%",
    },
    message: {
        marginTop: 10,
        textAlign: "center",
        color: "green",
    },
    walletInfo: {
        marginTop: 10,
        padding: 10,
        backgroundColor: "#333",
        borderRadius: 5,
    },
    walletDetail: {
        color: "#fff",
        fontSize: 14,
        marginBottom: 5,
    },
});


export default Home;

