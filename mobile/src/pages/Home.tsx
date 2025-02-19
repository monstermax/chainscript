
import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, TextInput, ActivityIndicator, Alert } from "react-native";
import tw from "twrnc";


import { createEthWallet } from "@frontend/utils/accountsUtils";
import { useWeb3 } from "@frontend/components/Web3Provider";


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
        <View style={tw`container`}>
            <Text style={tw`title`}>🚀 Bienvenue sur ChainScript Explorer</Text>

            <Text style={tw`subtitle`}>
                Votre portail vers une blockchain rapide, légère et modulaire.
            </Text>

            <View style={tw`card`}>
                <Text style={tw`sectionTitle`}>🌐 Informations sur la blockchain</Text>

                <View style={tw`infoList`}>
                    <Text style={tw`infoItem`}>Réseau : DEV (Localhost)</Text>
                    <Text style={tw`infoItem`}>Chain ID : {chainId}</Text>
                    <Text style={tw`infoItem`}>Monnaie native : {symbol}</Text>
                    <Text style={tw`infoItem`}>Explorateur : http://{rpcHost}</Text>
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
        <View style={tw`card`}>
            <Text style={tw`sectionTitle`}>🔑 Créer un Wallet</Text>

            <Button
                title={loading ? "⏳ Création..." : "🆕 Générer un wallet"}
                onPress={createWallet}
                disabled={loading}
            />

            {wallet && (
                <View style={tw`walletInfo`}>
                    <Text style={tw`walletDetail`}><strong>Adresse :</strong> {wallet.address}</Text>
                    <Text style={tw`walletDetail`}><strong>Clé privée :</strong> {wallet.privateKey}</Text>
                    <Text style={tw`walletDetail`}><strong>Seed :</strong> {wallet.mnemonic ?? "-"}</Text>
                </View>
            )}
        </View>
    );
};



const FaucetComponent: React.FC = () => {
    const { walletAddress } = { walletAddress: '0x0000000000000000000000000000000000000040' }; //useWeb3();
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
        <View style={tw`card`}>
            <Text style={tw`sectionTitle`}>💧 Faucet</Text>

            <TextInput
                style={tw`input`}
                placeholder="Entrez votre adresse"
                value={address ?? ""}
                onChangeText={(text) => setAddress(text)}
            />

            <Button
                title={loading ? "⏳ Demande en cours..." : "🚰 Demander des tokens"}
                onPress={requestFaucet}
                disabled={loading || !address}
            />

            {message && <Text style={tw`message`}>{message}</Text>}
        </View>
    );
};


//const styles = {
//    card: tw`bg-gray-100 p-4 rounded-lg shadow-lg`,
//    sectionTitle: tw`text-lg font-bold text-blue-500`,
//};



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
      // Ombre iOS
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3, // Ajout pour un rendu cohérent sur iOS
      // Ombre Android
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

