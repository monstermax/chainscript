
# Typescript Tiny Blockchain


## Nom (à définir)

- TinyChain → Ça met bien en avant la légèreté et la simplicité de la blockchain. Parfait si l'objectif est de garder un projet minimaliste et efficace.

- ChainScript → Ça évoque clairement l’idée d’une blockchain où les smart contracts sont des scripts JavaScript. Plus orienté sur l’aspect exécution de code.



## Roadmap
- Explorer web pour voir les transactions et smart contracts (etherscan like)
- Sécuriser les states (empecher d'avoir une incoherence entre les index et le state general. dans quel cas il faut recommencer la chaine a zero)
- Historisation les states (possibilité de revenir à un état précédent)
- Historisation les accounts (possibilité de connaitre l'etat d'un compte à n'importe quel block antérieur)
- Partager les transactions du mempool entre les peers
- Gérer le consensus (si 2 peers ont une blockchain qui diverge)
- Gestion des logs/events (emit("EventName"))
- Gas et frais de transaction dynamiques (gas & gasLimit)
- Optimisation VM / sandbox


---



### **🌐 Explorer web (Blockchain Explorer)**
- 🔹 Interface web avec **React + Tailwind** ou **Vue.js**
- 🔹 Pages pour :
  - 📜 **Liste des blocks** (avec leur hash, transactions, timestamp…)
  - 🔍 **Détail d’un block** (transactions, smart contracts…)
  - 🏦 **Liste des comptes** (solde, transactions associées…)
  - 📑 **Détail d’une transaction** (hash, inputs, outputs, status…)
  - ⚡ **Smart contracts** (liste des méthodes disponibles, état du stockage…)

---

### **🔒 Sécurisation des states & Rebuild de la chaîne**
- 🔹 Vérifier **l'intégrité du state global** après chaque block appliqué.
- 🔹 Comparer les **Merkle Roots** des transactions et des states pour détecter les corruptions.
- 🔹 Détection des forks en utilisant un **check des headers précédents**.
- 🔹 Mécanisme de **rollback & resync** si un peer détecte une divergence majeure.

---

### **📜 Historisation des states & accounts**
- 🔹 **Merkle Patricia Trie (MPT)** : Permet d’accéder à n’importe quel état passé sans stocker toute l’historique.
- 🔹 **Snapshot des comptes** tous les `X` blocks pour pouvoir faire des rollbacks précis.
- 🔹 Stocker un **mapping des balances et states** sur disque avec des checkpoints.
- 🔹 Possibilité d'extraire **l’état d’un compte à un block donné** (comme `eth_getBalance(address, blockNumber)`).

---

### **🔗 Partage du mempool entre peers**
- 🔹 Chaque peer **annonce ses transactions** aux autres (via un système de gossip).
- 🔹 Ajouter un **TTL** sur les transactions pour éviter de spammer le réseau.
- 🔹 Mécanisme de **propagation en cascade** : lorsqu’un peer reçoit une tx, il la relaye uniquement aux peers qui ne l'ont pas encore.
- 🔹 **Signature unique des transactions** pour éviter les doublons.

---

### **🛠 Gestion des forks & consensus**
- 🔹 **Longest chain rule** : choisir la chaîne la plus longue (avec le plus de travail cumulé).
- 🔹 **Fork resolution** :
  1. Détecter un fork via la divergence des headers (`parentHash` différent).
  2. Comparer le **cumulative work** (PoW, PoS ou autre).
  3. Si une chaîne est plus longue, rollback la plus courte et resynchroniser.
- 🔹 Possibilité d’avoir un **consensus custom** basé sur un système de réputation des nœuds.

---

### **📢 Gestion des logs/events**
- 🔹 Implémenter une fonction `emit("EventName", data)`, qui stocke les logs dans les blocks.
- 🔹 Permettre aux **dApps de s’abonner** aux événements (`eth_subscribe`).
- 🔹 Ajout d’une commande `eth_getLogs({ fromBlock, toBlock, address, topics })`.

---

### **⛽ Gas & frais de transaction dynamiques**
- 🔹 Implémenter un **gas price dynamique** en fonction de la demande réseau.
- 🔹 Ajouter une **priorité des transactions** en fonction du gas payé.
- 🔹 Permettre aux smart contracts d’exécuter des instructions limitées par `gasLimit`.

---

### **🛠 Optimisation VM & sandbox**
- 🔹 **Isolation renforcée** : Interdire certaines opérations (ex: accès au réseau).
- 🔹 **Limiter la mémoire utilisée** pour éviter les boucles infinies.
- 🔹 **Profiling de performance** pour détecter les appels coûteux.
- 🔹 **Multi-threading** pour l'exécution des smart contracts.




