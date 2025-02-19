
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

//import { useWeb3 } from "@frontend/components/Web3Provider";


type LayoutProps = {
  children?: React.ReactNode;
};


// Définir les paramètres de navigation
type RootStackParamList = {
  Home: undefined;
  Blocks: undefined;
  Transactions: undefined;
  Accounts: undefined;
  Web3: undefined;
  Dapps: undefined;
};


type NavigationProps = StackNavigationProp<RootStackParamList>;


const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigation = useNavigation<NavigationProps>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ChainScript</Text>
        <View style={styles.navLinks}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <Text style={styles.link}>🏠 Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Blocks")}>
            <Text style={styles.link}>📜 Blocks</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
            <Text style={styles.link}>💳 Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Accounts")}>
            <Text style={styles.link}>💼 Accounts</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Web3")}>
            <Text style={styles.link}>🌐 Web3</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Dapps")}>
            <Text style={styles.link}>💻 dApps</Text>
          </TouchableOpacity>
        </View>
        {/* ConnectWallet intégré dans le header */}
        <ConnectWallet />
      </View>

      {/* Contenu principal */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};



const ConnectWallet: React.FC = () => {
  const { walletAddress, connectWallet, copyAddressToClipboard } = { walletAddress: '', connectWallet: (b: boolean) => {}, copyAddressToClipboard: () => {} } ; //useWeb3();

  return (
    <View style={styles.walletSection}>
      {walletAddress ? (
        <View style={styles.connectedWallet}>
          <Text style={styles.walletText}>
            ✅ Connecté:{" "}
            {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
          </Text>
          <TouchableOpacity onPress={copyAddressToClipboard}>
            <Text style={styles.copyButton}>📋 Copier</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => connectWallet(true)} style={styles.connectButton}>
          <Text style={styles.connectButtonText}>🔌 Connecter le wallet</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 10,
    backgroundColor: "#f8f9fa",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  navLinks: {
    flexDirection: "row",
  },
  link: {
    marginHorizontal: 10,
    color: "#007bff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  walletSection: {
    marginTop: 10,
  },
  connectedWallet: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletText: {
    color: "green",
    marginRight: 10,
  },
  copyButton: {
    color: "#007bff",
  },
  connectButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
  },
  connectButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});


export default Layout;
