
import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";

import { bootstrap as bs } from '../styles/bootstrap';


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
        <View>
            <View style={[bs.textCenter, bs.mb3]}>
                <Text style={bs.h1}>🚀 Bienvenue sur <Text style={{ color: '#007bff' }}>ChainScript Explorer</Text></Text>
                <Text style={bs.text}>
                    Votre portail vers une blockchain rapide, légère et modulaire.
                </Text>
            </View>

            <View style={bs.card}>
                <Text style={[bs.h2, bs.textCenter]}>🌐 Informations sur la blockchain</Text>

                <View style={bs.formGroup}>
                    <Text style={bs.text}>Réseau : ChainScript</Text>
                    <Text style={bs.text}>Chain ID : {chainId}</Text>
                    <Text style={bs.text}>Monnaie native : {symbol}</Text>
                    <Text style={bs.text}>Explorateur : <Text style={{ color: '#007bff' }}>Explorer Local</Text></Text>
                </View>

                <TouchableOpacity
                    style={[bs.btn, bs.btnPrimary, bs.mt2]}
                    onPress={addChainToMetamask}
                    disabled={isAdding || added}
                >
                    <Text style={bs.btnText}>
                        {isAdding ? "⏳ Ajout en cours..." : added ? "✅ Réseau ajouté" : "➕ Ajouter à Metamask"}
                    </Text>
                </TouchableOpacity>
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
        <View style={bs.card}>
            <Text style={[bs.h2, bs.textCenter]}>🔑 Créer un Wallet</Text>

            <TouchableOpacity
                style={[bs.btn, bs.btnPrimary, bs.mt2, bs.mb3]}
                onPress={createWallet}
                disabled={loading}
            >
                <Text style={bs.btnText}>
                    {loading ? "⏳ Création..." : "🆕 Générer un wallet"}
                </Text>
            </TouchableOpacity>

            {wallet && (
                <View style={[bs.card, { backgroundColor: '#f8f9fa' }]}>
                    <Text style={bs.text}>
                        <Text style={{ fontWeight: 'bold' }}>Adresse :</Text> {wallet.address}
                    </Text>
                    <Text style={bs.text}>
                        <Text style={{ fontWeight: 'bold' }}>Clé privée :</Text> {wallet.privateKey}
                    </Text>
                    <Text style={bs.text}>
                        <Text style={{ fontWeight: 'bold' }}>Seed :</Text> {wallet.mnemonic ?? "-"}
                    </Text>
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
        <View style={bs.card}>
            <Text style={[bs.h2, bs.textCenter]}>💧 Faucet</Text>

            <View style={bs.formGroup}>
                <TextInput
                    style={bs.formControl}
                    placeholder="Entrez votre adresse"
                    value={address ?? ""}
                    onChangeText={(text) => setAddress(text)}
                />
            </View>

            <TouchableOpacity
                style={[bs.btn, bs.btnPrimary, bs.mt2]}
                onPress={requestFaucet}
                disabled={loading || !address}
            >
                <Text style={bs.btnText}>
                    {loading ? "⏳ Demande en cours..." : "🚰 Demander des tokens"}
                </Text>
            </TouchableOpacity>

            {message && <Text style={[bs.text, bs.mt2]}>{message}</Text>}
        </View>
    );
};


export default Home;

