// MonsterBattleGame.js


class MonsterBattleGame {
    constructor() {
        this.monsters = new Map(); // ID -> Monster
        this.battles = new Map(); // ID -> Battle
        this.players = new Map(); // Address -> Player
        this.randomSource = null; // Source d'aléatoire vérifié
        this.seasonStartTime = Date.now();
        this.seasonDuration = 30 * 24 * 60 * 60; // 30 jours
    }

    // === Création et évolution des monstres ===

    async mintMonster() /* write */ {
        const sender = lower(msg.sender);
        asserts(message.value >= this._getMintPrice(), "Paiement insuffisant pour le mint");

        // Générer un ADN aléatoire vérifié
        const randomValue = await call(this.randomSource, "", "getRandomNumber", []);

        const dna = BigInt(keccak256(encode(["uint256", "address", "uint256"],
            [randomValue, sender, Date.now()])));

        const monsterId = this._generateMonsterId();
        const monster = new Monster(monsterId, sender, dna);

        this.monsters.set(monsterId, monster);

        // Ajouter le monstre au joueur
        let player = this.players.get(sender);
        if (!player) {
            player = new Player(sender);
            this.players.set(sender, player);
        }
        player.monstersOwned.add(monsterId);

        this._emitEvent("MonsterCreated", {
            monsterId,
            owner: sender,
            dna: dna.toString()
        });
    }

    async trainMonster(monsterId) /* write */ {
        const monster = this._getAndVerifyMonsterOwnership(monsterId);
        asserts(monster.level < 100, "Niveau maximum atteint");
        asserts(Date.now() > monster.cooldown, "Monstre en récupération");

        // Coût d'entraînement croissant avec le niveau
        const trainingCost = this._getTrainingCost(monster.level);
        asserts(message.value >= trainingCost, "Paiement insuffisant pour l'entraînement");

        // Gains aléatoires de stats
        const randomValue = await call(this.randomSource, "", "getRandomNumber", []);
        const statGains = this._calculateTrainingGains(randomValue, monster.level);

        monster.attack += statGains.attack;
        monster.defense += statGains.defense;
        monster.speed += statGains.speed;
        monster.health += statGains.health;
        monster.cooldown = Date.now() + (3600 * 1000); // 1 heure de cooldown

        this._emitEvent("MonsterTrained", {
            monsterId,
            gains: statGains
        });
    }

    // === Système de combat ===

    async initiateBattle(monster1Id, monster2Id) /* write */ {
        const monster1 = this._getAndVerifyMonsterOwnership(monster1Id);
        const monster2 = this.monsters.get(monster2Id);
        asserts(monster2, "Monstre adversaire non trouvé");

        asserts(monster1.owner !== monster2.owner, "Impossible de combattre ses propres monstres");
        asserts(Date.now() > monster1.cooldown, "Monstre 1 en récupération");
        asserts(Date.now() > monster2.cooldown, "Monstre 2 en récupération");

        const battleId = this._generateBattleId();
        const battle = new Battle(battleId, monster1Id, monster2Id);
        this.battles.set(battleId, battle);

        await this._executeBattle(battle);
        return battleId;
    }

    async _executeBattle(battle) /* write */ {
        const monster1 = this.monsters.get(battle.monster1Id);
        const monster2 = this.monsters.get(battle.monster2Id);

        let hp1 = monster1.health;
        let hp2 = monster2.health;

        battle.status = "ACTIVE";

        // Déterminer qui commence (basé sur la vitesse)
        let firstAttacker = monster1.speed > monster2.speed ? monster1 : monster2;
        let secondAttacker = firstAttacker === monster1 ? monster2 : monster1;

        // Simuler les rounds
        while (hp1 > 0 && hp2 > 0) {
            // Obtenir un nombre aléatoire pour les variations de dégâts
            const randomValue = await call(this.randomSource, "", "getRandomNumber", []);

            // Premier attaquant
            const damage1 = this._calculateDamage(firstAttacker, secondAttacker, randomValue);
            if (firstAttacker === monster1) {
                hp2 -= damage1;
            } else {
                hp1 -= damage1;
            }

            if (hp1 <= 0 || hp2 <= 0) break;

            // Second attaquant
            const damage2 = this._calculateDamage(secondAttacker, firstAttacker, randomValue >> 128);
            if (secondAttacker === monster1) {
                hp2 -= damage2;
            } else {
                hp1 -= damage2;
            }

            battle.rounds.push({
                firstAttackerDamage: damage1,
                secondAttackerDamage: damage2
            });
        }

        // Déterminer le vainqueur
        const winner = hp1 > 0 ? monster1 : monster2;
        const loser = winner === monster1 ? monster2 : monster1;

        battle.winner = winner.id;
        battle.status = "FINISHED";

        // Mettre à jour les stats
        winner.wins++;
        winner.experience += 100;
        loser.losses++;
        loser.experience += 25;

        // Appliquer les cooldowns
        winner.cooldown = Date.now() + (1800 * 1000); // 30 minutes
        loser.cooldown = Date.now() + (3600 * 1000); // 1 heure

        // Mettre à jour les points de saison
        const winnerPlayer = this.players.get(winner.owner);
        const loserPlayer = this.players.get(loser.owner);
        winnerPlayer.seasonPoints += 10;
        loserPlayer.seasonPoints += 2;

        this._emitEvent("BattleCompleted", {
            battleId: battle.id,
            winner: winner.id,
            loser: loser.id,
            rounds: battle.rounds.length
        });

        // Vérifier les évolutions possibles
        await this._checkLevelUp(winner);
        await this._checkLevelUp(loser);
    }

    // === Système de récompenses et classement ===

    async claimSeasonRewards() /* write */ {
        const sender = lower(msg.sender);
        const player = this.players.get(sender);
        asserts(player, "Joueur non trouvé");

        const currentTime = Date.now();
        asserts(currentTime > player.lastRewardClaim + (24 * 3600 * 1000),
            "Récompenses déjà réclamées aujourd'hui");

        // Calculer les récompenses basées sur le rang
        const rewards = this._calculateSeasonRewards(player);

        // Transférer les récompenses
        await transfer(sender, rewards);

        player.lastRewardClaim = currentTime;

        this._emitEvent("RewardsClaimed", {
            player: sender,
            amount: rewards
        });
    }

    async updatePlayerRank(playerAddress) /* write */ {
        const player = this.players.get(playerAddress);
        asserts(player, "Joueur non trouvé");

        const newRank = this._calculateRank(player.seasonPoints);
        if (newRank !== player.rank) {
            player.rank = newRank;

            this._emitEvent("RankUpdated", {
                player: playerAddress,
                newRank
            });
        }
    }

    // === Fonctions utilitaires ===

    _calculateDamage(attacker, defender, randomValue) {
        const baseDamage = attacker.attack - (defender.defense / 2);
        const variation = (randomValue % 20) - 10; // ±10% variation
        return Math.max(1, Math.floor(baseDamage * (1 + variation / 100)));
    }

    _getTrainingCost(level) {
        return BigInt(1e16) * BigInt(level); // 0.01 ETH * level
    }

    _getMintPrice() {
        return BigInt(1e17); // 0.1 ETH
    }

    _calculateRank(points) {
        if (points < 100) return "BRONZE";
        if (points < 500) return "SILVER";
        if (points < 2000) return "GOLD";
        return "DIAMOND";
    }

    _calculateSeasonRewards(player) {
        const rewards = {
            "BRONZE": BigInt(1e16), // 0.01 ETH
            "SILVER": BigInt(5e16), // 0.05 ETH
            "GOLD": BigInt(1e17),   // 0.1 ETH
            "DIAMOND": BigInt(5e17)  // 0.5 ETH
        };
        return rewards[player.rank];
    }

    async _checkLevelUp(monster) {
        const expNeeded = monster.level * 100;
        if (monster.experience >= expNeeded && monster.level < 100) {
            monster.level++;
            monster.experience -= expNeeded;

            // Bonus de stats par niveau
            monster.attack += 2;
            monster.defense += 2;
            monster.speed += 2;
            monster.health += 5;

            this._emitEvent("MonsterLevelUp", {
                monsterId: monster.id,
                newLevel: monster.level
            });
        }
    }

    // === Getters ===

    async getMonster(monsterId) {
        return this.monsters.get(monsterId);
    }

    async getBattle(battleId) {
        return this.battles.get(battleId);
    }

    async getPlayer(address) {
        return this.players.get(lower(address));
    }

    async getLeaderboard() {
        return Array.from(this.players.values())
            .sort((a, b) => b.seasonPoints - a.seasonPoints)
            .slice(0, 100);
    }
}




// === Structures de données ===

class Monster {
    constructor(id, owner, dna) {
        this.id = id;
        this.owner = owner;
        this.dna = dna; // Détermine les stats et l'apparence
        this.level = 1;
        this.experience = 0;
        this.wins = 0;
        this.losses = 0;
        this.lastBattle = 0;
        this.cooldown = 0;

        // Stats calculées depuis l'ADN
        const stats = this._calculateStats(dna);
        this.attack = stats.attack;
        this.defense = stats.defense;
        this.speed = stats.speed;
        this.health = stats.health;
        this.specialAbility = stats.specialAbility;
    }

    _calculateStats(dna) {
        return {
            attack: (dna & 0xFF) + 50, // 0-255 + base stat
            defense: ((dna >> 8) & 0xFF) + 50,
            speed: ((dna >> 16) & 0xFF) + 50,
            health: ((dna >> 24) & 0xFF) + 100,
            specialAbility: ((dna >> 32) & 0xF) // 16 abilities possibles
        };
    }
}

class Battle {
    constructor(id, monster1Id, monster2Id) {
        this.id = id;
        this.monster1Id = monster1Id;
        this.monster2Id = monster2Id;
        this.rounds = [];
        this.status = "PENDING"; // PENDING, ACTIVE, FINISHED
        this.winner = null;
        this.timestamp = Date.now();
        this.rewards = {
            winner: 0n,
            loser: 0n
        };
    }
}

class Player {
    constructor(address) {
        this.address = address;
        this.seasonPoints = 0;
        this.totalBattles = 0;
        this.monstersOwned = new Set();
        this.rank = "BRONZE";
        this.lastRewardClaim = 0;
    }
}





/*

Ce jeu combine plusieurs aspects intéressants :

Système de monstres NFT :
- Chaque monstre a un ADN unique qui détermine ses stats
- Stats : attaque, défense, vitesse, santé
- Système d'expérience et de niveaux
- Capacités spéciales basées sur l'ADN


Système de combat :
- Combats tour par tour basés sur la vitesse
- Dégâts calculés avec variations aléatoires
- Système de cooldown après les combats
- Rewards d'expérience pour le vainqueur et le perdant


Progression et économie :
- Système de saisons avec classement
- Rangs (Bronze, Silver, Gold, Diamond)
- Récompenses quotidiennes basées sur le rang
- Coûts croissants pour l'entraînement


Mécaniques de jeu additionnelles :
- Entraînement pour améliorer les stats
- Limite de niveau (100)
- Leaderboard des meilleurs joueurs
- Événements pour suivre toutes les actions


*/