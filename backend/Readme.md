
# ChainScript

ChainScript est une blockchain minimaliste et performante, permettant l'exécution de **smart contracts en JavaScript**. Compatible avec **Metamask**, elle supporte les transactions simples et les interactions avec des contrats intelligents.

## Fonctionnalités

✅ **Blockchain légère** avec une structure optimisée.  
✅ **Smart contracts en JavaScript**, sans Solidity.  
✅ **Compatible Metamask** via RPC.  
✅ **Système de P2P** pour la synchronisation entre nœuds.  
✅ **Transactions simples et appels de contrats**.  
✅ **Exécution de transactions et consensus distribué**.  
✅ **Gestion des logs et événements dans les smart contracts**.  

## Installation

1. Clonez le repository :
   ```sh
   git clone https://github.com/monstermax/chainscript.git
   cd chainscript
   npm install
   ```

2. Installez `ts-node` si nécessaire :
   ```sh
   npm install -g ts-node typescript
   ```

## Utilisation

### 📌 Initialisation de la blockchain
```sh
ts-node cli.ts --init [--force]  # Initialise la blockchain, y compris le bloc genesis
```

### 🚀 Démarrage du nœud
```sh
ts-node cli.ts --listen [--mine]  # Écoute les transactions RPC & P2P et mine de nouveaux blocs
```

### 🔍 Monitoring & Debug
```sh
ts-node cli.ts --dump-accounts   # Affiche les comptes enregistrés

ts-node cli.ts --dump-memories   # Affiche les mémoires des contrats

ts-node cli.ts --dump-blocks     # Affiche la liste des blocs
```

### ⚙️ Options supplémentaires
```sh
ts-node cli.ts --dir ~/.blockchain-js [...]  # Spécifie un répertoire personnalisé pour la blockchain

ts-node cli.ts --rpc 8545 [...]              # Définit le port RPC (par défaut 8545)

ts-node cli.ts --p2p 6001 [...]              # Définit le port P2P (par défaut 6001)
```

## Exemple : Déploiement & Interaction avec un smart contract

### 📜 1. Écrire un contrat simple en JavaScript
```js
class MyToken {
    #memory = memory({
        totalSupply: 1000000n,
        balances: { "0x123...": 1000000n }
    });

    balanceOf(address) {
        return this.#memory.balances[address] || 0n;
    }

    transfer(to, amount) /* write */ {
        asserts(this.#memory.balances[caller] >= amount, "Insufficient balance");
        this.#memory.balances[caller] -= amount;
        this.#memory.balances[to] = (this.#memory.balances[to] || 0n) + amount;
    }
}
```

### 🚀 2. Déployer le contrat via Metamask

Utilisez une interface Web ou un script pour envoyer une transaction avec le **bytecode du contrat**.

```js
const bytecode = ethers.utils.defaultAbiCoder.encode(["string", "string"], [contractCode, "[]"]);
await signer.sendTransaction({ data: bytecode });
```

### 🔍 3. Lire un smart contract

```js
const contract = new ethers.Contract(contractAddress, customAbi, provider);
const balance = await contract.balanceOf("0x123...");
console.log("Balance:", balance.toString());
```

### ✏️ 4. Envoyer une transaction (écrire dans un smart contract)

```js
const tx = await contract.transfer("0x456...", "100");
await tx.wait();
```

## 📜 Roadmap
- [ ] Explorateur web des transactions & contrats.
- [ ] Sécurisation et rollback des états blockchain.
- [ ] Synchronisation avancée du mempool entre les nœuds.
- [ ] Système de consensus amélioré.
- [ ] Gestion des logs et événements dans les smart contracts.
- [ ] Implémentation des frais de transactions dynamiques (gas).
- [ ] Optimisation de la VM et des performances.

## 📜 Licence
MIT License

---

ChainScript, une blockchain **simple, flexible et puissante** 🚀.

