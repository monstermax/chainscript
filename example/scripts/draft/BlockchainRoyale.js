// BlockchainRoyale.js


class BlockchainRoyale {
    constructor() {
        this.matches = new Map(); // ID -> Match
        this.players = new Map(); // Address -> Player
        this.gameStats = new Map(); // Address -> Stats
        this.seasonStats = new Map(); // Address -> SeasonStats
        this.randomSource = null;
        this.currentSeason = 1;
    }

    // === Gestion des matchs ===

    async createMatch(entryFee) /* write */ {
        asserts(entryFee >= 0, "Frais d'entrée invalides");

        const matchId = this._generateMatchId();
        const match = new Match(matchId, entryFee);

        // Générer la carte avec des points d'intérêt
        this._generateMap(match);

        // Placer les objets initiaux
        this._generateInitialLoot(match);

        this.matches.set(matchId, match);

        this._emitEvent("MatchCreated", {
            matchId,
            entryFee
        });

        return matchId;
    }

    async joinMatch(matchId) /* write */ {
        const sender = lower(msg.sender);
        const match = this.matches.get(matchId);

        asserts(match, "Match non trouvé");
        asserts(match.status === "WAITING", "Match déjà commencé");
        asserts(match.players.size < match.maxPlayers, "Match complet");
        asserts(message.value >= match.entryFee, "Frais d'entrée insuffisants");

        // Créer l'état initial du joueur
        const player = new PlayerState(sender);

        // Position de départ aléatoire sur les bords de la carte
        const randomValue = await call(this.randomSource, "", "getRandomNumber", []);
        player.position = this._getRandomStartPosition(randomValue);

        match.players.set(sender, player);
        match.prizePool += match.entryFee;

        this._emitEvent("PlayerJoined", {
            matchId,
            player: sender
        });

        // Démarrer le match si assez de joueurs
        if (match.players.size >= match.minPlayers) {
            await this._startMatch(match);
        }
    }

    async _startMatch(match) /* write */ {
        match.status = "STARTING";
        match.startTime = Date.now();
        match.remainingPlayers = match.players.size;

        // Timer avant le début effectif
        await this._sleep(30000); // 30 secondes de préparation

        match.status = "ACTIVE";
        match.nextZoneTime = Date.now() + 300000; // 5 minutes avant la première zone

        this._emitEvent("MatchStarted", {
            matchId: match.id,
            playerCount: match.players.size
        });
    }

    // === Actions des joueurs ===

    async move(matchId, direction) /* write */ {
        const match = this._getActiveMatch(matchId);
        const player = this._getAlivePlayer(match);

        // Vérifier la stamina
        asserts(player.stamina >= 10, "Pas assez d'endurance");

        // Calculer la nouvelle position
        const newPosition = this._calculateNewPosition(player.position, direction);

        // Vérifier si la position est valide et dans la zone sûre
        asserts(this._isValidPosition(match, newPosition),
            "Position invalide");
        asserts(this._isInSafeZone(match, newPosition),
            "Cette zone est mortelle !");

        // Coût en stamina
        player.stamina -= 10;
        player.position = newPosition;

        // Récupérer automatiquement les objets à la nouvelle position
        await this._checkForLoot(match, player);

        this._emitEvent("PlayerMoved", {
            matchId,
            player: player.address,
            position: newPosition
        });
    }

    async attack(matchId, targetPosition) /* write */ {
        const match = this._getActiveMatch(matchId);
        const player = this._getAlivePlayer(match);

        // Vérifier si le joueur a une arme équipée
        asserts(player.equippedWeapon, "Pas d'arme équipée");

        const weapon = player.equippedWeapon;

        // Vérifier les munitions
        const ammo = player.inventory.ammo.get(weapon.ammoType) || 0;
        asserts(ammo > 0, "Plus de munitions");

        // Vérifier la distance
        const distance = this._calculateDistance(player.position, targetPosition);
        asserts(distance <= weapon.range, "Cible hors de portée");

        // Trouver la cible
        const target = this._findPlayerAtPosition(match, targetPosition);
        if (target) {
            // Calculer les dégâts
            const damage = this._calculateDamage(weapon.damage, target.shield, target.equippedArmor);

            // Appliquer les dégâts
            target.health -= damage;
            player.damageDealt += damage;

            // Réduire les munitions
            player.inventory.ammo.set(weapon.ammoType, ammo - 1);

            // Vérifier si la cible est morte
            if (target.health <= 0) {
                await this._handlePlayerDeath(match, target, player);
            }

            this._emitEvent("PlayerAttacked", {
                matchId,
                attacker: player.address,
                target: target.address,
                damage,
                weaponType: weapon.type
            });
        }
    }

    async useItem(matchId, itemIndex) /* write */ {
        const match = this._getActiveMatch(matchId);
        const player = this._getAlivePlayer(match);

        const item = player.inventory.healing[itemIndex];
        asserts(item, "Item non trouvé");

        switch (item.type) {
            case "MEDKIT":
                player.health = Math.min(100, player.health + 50);
                break;
            case "BANDAGE":
                player.health = Math.min(100, player.health + 25);
                break;
            case "SHIELD_POTION":
                player.shield = Math.min(100, player.shield + 50);
                break;
            case "ENERGY_DRINK":
                player.stamina = 100;
                break;
        }

        // Retirer l'item de l'inventaire
        player.inventory.healing.splice(itemIndex, 1);

        this._emitEvent("ItemUsed", {
            matchId,
            player: player.address,
            itemType: item.type
        });
    }

    // === Gestion de la zone ===

    async updateZone(matchId) /* write */ {
        const match = this._getActiveMatch(matchId);

        if (Date.now() >= match.nextZoneTime) {
            // Réduire la zone sûre
            match.currentZoneIndex++;
            const newSafeZone = this._calculateNewSafeZone(match);
            match.safeZones.push(newSafeZone);

            // Dégâts aux joueurs hors zone
            for (const player of match.players.values()) {
                if (player.status === "ALIVE" && !this._isInSafeZone(match, player.position)) {
                    player.health -= 10;
                    if (player.health <= 0) {
                        await this._handlePlayerDeath(match, player, null);
                    }
                }
            }

            // Programmer la prochaine réduction
            match.nextZoneTime = Date.now() + 300000; // 5 minutes

            this._emitEvent("ZoneUpdated", {
                matchId,
                zoneIndex: match.currentZoneIndex,
                safeZone: newSafeZone
            });
        }
    }

    // === Fin de match ===

    async _handlePlayerDeath(match, deadPlayer, killer) /* write */ {
        deadPlayer.status = "DEAD";
        match.remainingPlayers--;

        // Laisser tomber le loot
        this._dropPlayerLoot(match, deadPlayer);

        // Mettre à jour les stats
        if (killer) {
            killer.kills++;

            // Bonus de santé/bouclier pour le kill
            killer.health = Math.min(100, killer.health + 25);
            killer.shield = Math.min(100, killer.shield + 25);
        }

        // Vérifier si c'est la fin du match
        if (match.remainingPlayers <= 1) {
            await this._endMatch(match);
        }

        this._emitEvent("PlayerDied", {
            matchId: match.id,
            player: deadPlayer.address,
            killer: killer?.address || null,
            placement: match.remainingPlayers + 1
        });
    }

    async _endMatch(match) /* write */ {
        match.status = "FINISHED";
        match.endTime = Date.now();

        // Trouver le vainqueur
        const winner = Array.from(match.players.values())
            .find(p => p.status === "ALIVE");

        if (winner) {
            // Distribuer les récompenses
            const rewards = this._calculateRewards(match, winner);
            for (const [player, amount] of rewards) {
                await transfer(player, amount);
            }

            // Mettre à jour les stats
            this._updatePlayerStats(match);
        }

        this._emitEvent("MatchEnded", {
            matchId: match.id,
            winner: winner?.address,
            duration: match.endTime - match.startTime
        });
    }

    // === Utilitaires ===

    _calculateDamage(baseDamage, shield, armor) {
        let damage = baseDamage;

        // Réduction par l'armure (20-50%)
        if (armor) {
            damage *= (1 - (0.2 + (armor.level * 0.1)));
        }

        // Appliquer d'abord au bouclier
        if (shield > 0) {
            if (shield >= damage) {
                shield -= damage;
                return 0;
            } else {
                damage -= shield;
                shield = 0;
            }
        }

        return Math.floor(damage);
    }

    _calculateRewards(match, winner) {
        const rewards = new Map();
        const totalPrize = match.prizePool;

        // 50% pour le vainqueur
        rewards.set(winner.address, totalPrize * 50n / 100n);

        // 30% répartis entre les 2e et 3e
        const runnersUp = Array.from(match.players.values())
            .sort((a, b) => {
                if (a === winner) return -1;
                if (b === winner) return 1;
                return (b.kills * 100 + b.damageDealt) -
                    (a.kills * 100 + a.damageDealt);
            })
            .slice(1, 3);

        if (runnersUp.length > 0) {
            rewards.set(runnersUp[0].address, totalPrize * 20n / 100n);
            if (runnersUp.length > 1) {
                rewards.set(runnersUp[1].address, totalPrize * 10n / 100n);
            }
        }

        // 20% répartis selon les kills
        const killPrize = totalPrize * 20n / 100n;
        const totalKills = Array.from(match.players.values())
            .reduce((sum, p) => sum + p.kills, 0);

        if (totalKills > 0) {
            for (const player of match.players.values()) {
                if (player.kills > 0) {
                    const killReward = (killPrize * BigInt(player.kills)) / BigInt(totalKills);
                    rewards.set(player.address,
                        (rewards.get(player.address) || 0n) + killReward);
                }
            }
        }

        return rewards;
    }

    _updatePlayerStats(match) {
        for (const [address, player] of match.players) {
            const stats = this.gameStats.get(address) || {
                matches: 0,
                wins: 0,
                kills: 0,
                damageDealt: 0,
                topTen: 0
            };

            stats.matches++;
            if (player.status === "ALIVE") stats.wins++;
            stats.kills += player.kills;
            stats.damageDealt += player.damageDealt;
            if (match.remainingPlayers <= 10) stats.topTen++;

            this.gameStats.set(address, stats);
        }
    }

    // === Getters ===

    async getMatch(matchId) {
        return this.matches.get(matchId);
    }

    async getPlayer(matchId, playerAddress) {
        const match = this.matches.get(matchId);
        if (!match) return null;

        const player = match.players.get(lower(playerAddress));
        if (!player) return null;

        // Retourner une vue sécurisée du joueur
        return {
            address: player.address,
            position: player.position,
            health: player.health,
            shield: player.shield,
            status: player.status,
            kills: player.kills,
            equippedWeapon: player.equippedWeapon ? {
                type: player.equippedWeapon.type,
                ammoType: player.equippedWeapon.ammoType
            } : null,
            equippedArmor: player.equippedArmor ? {
                type: player.equippedArmor.type,
                level: player.equippedArmor.level
            } : null
        };
    }

    async getNearbyPlayers(matchId, position, radius) {
        const match = this.matches.get(matchId);
        if (!match) return [];

        return Array.from(match.players.values())
            .filter(player =>
                player.status === "ALIVE" &&
                this._calculateDistance(position, player.position) <= radius
            )
            .map(player => ({
                address: player.address,
                position: player.position,
                status: player.status
            }));
    }

    async getZoneInfo(matchId) {
        const match = this.matches.get(matchId);
        if (!match) return null;

        return {
            currentZone: match.safeZones[match.safeZones.length - 1],
            nextZoneTime: match.nextZoneTime,
            zoneIndex: match.currentZoneIndex
        };
    }

    async getNearbyLoot(matchId, position, radius) {
        const match = this.matches.get(matchId);
        if (!match) return [];

        const nearbyLoot = [];
        for (const [posKey, item] of match.items) {
            const [x, y] = posKey.split(',').map(Number);
            if (this._calculateDistance(position, { x, y }) <= radius) {
                nearbyLoot.push({
                    position: { x, y },
                    type: item.type,
                    // Ne pas révéler les stats précises des items
                    subType: item.type === "WEAPON" ? item.type :
                        item.type === "ARMOR" ? item.level :
                            item.type === "AMMO" ? item.ammoType : null
                });
            }
        }
        return nearbyLoot;
    }

    async getMatchSummary(matchId) {
        const match = this.matches.get(matchId);
        if (!match) return null;

        return {
            id: match.id,
            status: match.status,
            playerCount: match.players.size,
            remainingPlayers: match.remainingPlayers,
            startTime: match.startTime,
            endTime: match.endTime,
            prizePool: match.prizePool,
            topKillers: Array.from(match.players.values())
                .sort((a, b) => b.kills - a.kills)
                .slice(0, 5)
                .map(p => ({
                    address: p.address,
                    kills: p.kills,
                    status: p.status
                }))
        };
    }


    async getPlayerState(matchId, address) {
        const match = this.matches.get(matchId);
        if (!match) return null;
        return match.players.get(lower(address));
    }

    async getPlayerStats(address) {
        return this.gameStats.get(lower(address));
    }

    async getLeaderboard() {
        return Array.from(this.gameStats.entries())
            .map(([address, stats]) => ({
                address,
                ...stats,
                winRate: (stats.wins / stats.matches * 100).toFixed(2),
                kdr: (stats.kills / (stats.matches - stats.wins)).toFixed(2)
            }))
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 100);
    }

    async getActiveMatches() {
        return Array.from(this.matches.values())
            .filter(m => m.status === "WAITING" || m.status === "STARTING");
    }

    // === Système d'équipement ===

    _generateInitialLoot(match) {
        const weapons = [
            new Weapon("PISTOL", 15, 3, 2, "LIGHT"),
            new Weapon("SMG", 12, 4, 5, "LIGHT"),
            new Weapon("RIFLE", 25, 8, 3, "HEAVY"),
            new Weapon("SNIPER", 75, 15, 1, "HEAVY"),
            new Weapon("SHOTGUN", 80, 2, 2, "SHELLS")
        ];

        const healing = [
            { type: "MEDKIT", healing: 50 },
            { type: "BANDAGE", healing: 25 },
            { type: "SHIELD_POTION", shield: 50 },
            { type: "ENERGY_DRINK", stamina: 100 }
        ];

        const armor = [
            { type: "LIGHT", level: 1, reduction: 0.2 },
            { type: "MEDIUM", level: 2, reduction: 0.35 },
            { type: "HEAVY", level: 3, reduction: 0.5 }
        ];

        // Placer les objets sur la carte
        for (let i = 0; i < 200; i++) {
            const position = this._getRandomPosition();
            const itemType = Math.random();

            let item;
            if (itemType < 0.4) { // 40% armes
                item = {
                    type: "WEAPON",
                    ...weapons[Math.floor(Math.random() * weapons.length)],
                    ammo: Math.floor(Math.random() * 30) + 20
                };
            } else if (itemType < 0.7) { // 30% soins
                item = {
                    type: "HEALING",
                    ...healing[Math.floor(Math.random() * healing.length)]
                };
            } else if (itemType < 0.9) { // 20% armure
                item = {
                    type: "ARMOR",
                    ...armor[Math.floor(Math.random() * armor.length)]
                };
            } else { // 10% munitions
                item = {
                    type: "AMMO",
                    ammoType: ["LIGHT", "HEAVY", "SHELLS"][Math.floor(Math.random() * 3)],
                    amount: Math.floor(Math.random() * 50) + 20
                };
            }

            match.items.set(`${position.x},${position.y}`, item);
        }
    }

    async _checkForLoot(match, player) {
        const posKey = `${player.position.x},${player.position.y}`;
        const item = match.items.get(posKey);

        if (item) {
            switch (item.type) {
                case "WEAPON":
                    if (player.inventory.weapons.length < 2) {
                        player.inventory.weapons.push({
                            type: item.type,
                            damage: item.damage,
                            range: item.range,
                            fireRate: item.fireRate,
                            ammoType: item.ammoType
                        });
                        // Ajouter les munitions
                        const currentAmmo = player.inventory.ammo.get(item.ammoType) || 0;
                        player.inventory.ammo.set(item.ammoType, currentAmmo + item.ammo);
                    }
                    break;

                case "HEALING":
                    if (player.inventory.healing.length < 5) {
                        player.inventory.healing.push({
                            type: item.type,
                            healing: item.healing,
                            shield: item.shield,
                            stamina: item.stamina
                        });
                    }
                    break;

                case "ARMOR":
                    if (player.inventory.armor.length < 1) {
                        player.inventory.armor.push({
                            type: item.type,
                            level: item.level,
                            reduction: item.reduction
                        });
                    }
                    break;

                case "AMMO":
                    const currentAmmo = player.inventory.ammo.get(item.ammoType) || 0;
                    player.inventory.ammo.set(item.ammoType, currentAmmo + item.amount);
                    break;
            }

            // Retirer l'item de la carte
            match.items.delete(posKey);

            this._emitEvent("ItemLooted", {
                matchId: match.id,
                player: player.address,
                itemType: item.type
            });
        }
    }

    // === Système de zone ===

    _calculateNewSafeZone(match) {
        const currentZone = match.safeZones[match.safeZones.length - 1] || {
            x: 0, y: 0,
            width: 32, height: 32
        };

        const reduction = 0.6; // Réduction de 40% à chaque fois
        const newWidth = Math.floor(currentZone.width * reduction);
        const newHeight = Math.floor(currentZone.height * reduction);

        // Centre de la nouvelle zone aléatoire mais dans l'ancienne zone
        const randomValue = BigInt(keccak256(encode(["uint256", "uint256"],
            [match.id, match.currentZoneIndex])));

        const maxX = currentZone.width - newWidth;
        const maxY = currentZone.height - newHeight;

        const x = currentZone.x + (Number(randomValue & 0xFFn) % maxX);
        const y = currentZone.y + (Number((randomValue >> 8n) & 0xFFn) % maxY);

        return { x, y, width: newWidth, height: newHeight };
    }

    _isInSafeZone(match, position) {
        if (match.safeZones.length === 0) return true;

        const currentZone = match.safeZones[match.safeZones.length - 1];
        return position.x >= currentZone.x &&
            position.x < (currentZone.x + currentZone.width) &&
            position.y >= currentZone.y &&
            position.y < (currentZone.y + currentZone.height);
    }

    // === Vérifications et utilitaires ===

    _getActiveMatch(matchId) {
        const match = this.matches.get(matchId);
        asserts(match, "Match non trouvé");
        asserts(match.status === "ACTIVE", "Match non actif");
        return match;
    }

    _getAlivePlayer(match) {
        const player = match.players.get(lower(msg.sender));
        asserts(player, "Joueur non trouvé");
        asserts(player.status === "ALIVE", "Joueur éliminé");
        return player;
    }

    _calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    _findPlayerAtPosition(match, position) {
        return Array.from(match.players.values())
            .find(p => p.status === "ALIVE" &&
                p.position.x === position.x &&
                p.position.y === position.y);
    }

    _dropPlayerLoot(match, player) {
        const position = player.position;
        const posKey = `${position.x},${position.y}`;

        // Regrouper tout le loot dans un pile
        const loot = {
            weapons: player.inventory.weapons,
            healing: player.inventory.healing,
            armor: player.inventory.armor,
            ammo: Object.fromEntries(player.inventory.ammo)
        };

        match.items.set(posKey, {
            type: "DEATH_CRATE",
            contents: loot
        });
    }

    _generateMatchId() {
        return keccak256(encode(["uint256", "string"], [Date.now(), "MATCH"]));
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}





// === Structures de données ===

class Match {
    constructor(id, entryFee) {
        this.id = id;
        this.status = "WAITING"; // WAITING, STARTING, ACTIVE, FINISHED
        this.players = new Map(); // Address -> PlayerState
        this.grid = new Array(32).fill(null).map(() => new Array(32).fill(null));
        this.safeZones = [];
        this.items = new Map(); // Position -> Item
        this.startTime = null;
        this.endTime = null;
        this.prizePool = 0n;
        this.entryFee = BigInt(entryFee);
        this.minPlayers = 50;
        this.maxPlayers = 100;
        this.actions = []; // Log des actions
        this.remainingPlayers = 0;
        this.nextZoneTime = 0;
        this.currentZoneIndex = 0;
    }
}


class PlayerState {
    constructor(address) {
        this.address = address;
        this.position = { x: 0, y: 0 };
        this.health = 100;
        this.shield = 0;
        this.stamina = 100;
        this.inventory = {
            weapons: [],
            healing: [],
            armor: [],
            ammo: new Map() // Type -> Amount
        };
        this.status = "ALIVE"; // ALIVE, DEAD
        this.kills = 0;
        this.damageDealt = 0;
        this.lastAction = Date.now();
        this.equippedWeapon = null;
        this.equippedArmor = null;
    }
}


class Weapon {
    constructor(type, damage, range, fireRate, ammoType) {
        this.type = type;
        this.damage = damage;
        this.range = range;
        this.fireRate = fireRate;
        this.ammoType = ammoType;
    }
}




/*

Ce battle royale propose plusieurs mécaniques intéressantes :

Système de combat élaboré :
- Différentes armes avec stats uniques (dégâts, portée, cadence)
- Système d'armure et de bouclier
- Gestion des munitions
- Stamina pour les déplacements


Gestion de la zone :
- Rétrécissement progressif
- Dégâts hors de la zone
- Positions stratégiques


Système de loot :
- Armes variées (pistolet, SMG, fusil, sniper, shotgun)
- Items de soin (medkit, bandages, potions)
- Armures de différents niveaux
- Munitions


Mécaniques de récompense :
- Prix pour le vainqueur (50%)
- Récompenses pour top 3
- Bonus basés sur les kills
- Système de stats et classement


Features de gameplay :
- Jusqu'à 100 joueurs
- Map de 32x32
- Phase de préparation
- Gestion des items au sol
- Système d'inventaire limité


*/

