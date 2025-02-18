// SpaceRacingGame.js

class SpaceRacingGame {

    constructor() {
        this.ships = new Map(); // ID -> Ship
        this.races = new Map(); // ID -> Race
        this.tracks = new Map(); // ID -> Track
        this.players = new Map(); // Address -> Player
        this.bets = new Map(); // RaceID -> Bets
        this.randomSource = null; // Source d'aléatoire vérifié
        this.partsMarket = new Map(); // ID -> Part
    }

    // === Structures de données ===

    // === Gestion des vaisseaux ===

    async mintShip() /* write */ {
        const sender = lower(msg.sender);
        asserts(message.value >= this._getMintPrice(), "Paiement insuffisant pour le mint");

        // Générer un blueprint aléatoire vérifié
        const randomValue = await call(this.randomSource, "", "getRandomNumber", []);
        const blueprint = this._generateBlueprint(randomValue);

        const shipId = this._generateShipId();
        const ship = new Ship(shipId, sender, blueprint);

        this.ships.set(shipId, ship);

        let player = this.players.get(sender);
        if (!player) {
            player = new Player(sender);
            this.players.set(sender, player);
        }
        player.ships.add(shipId);

        this._emitEvent("ShipCreated", {
            shipId,
            owner: sender,
            blueprint
        });
    }

    async installPart(shipId, partId) /* write */ {
        const ship = this._getAndVerifyShipOwnership(shipId);
        const part = this.partsMarket.get(partId);
        asserts(part, "Pièce non trouvée");
        asserts(message.value >= part.price, "Paiement insuffisant");

        // Vérifier la compatibilité
        asserts(ship.level >= this._getPartLevelRequirement(part),
            "Niveau de vaisseau insuffisant");

        // Installation
        const oldPart = ship.parts[part.type];
        ship.parts[part.type] = part;

        this._emitEvent("PartInstalled", {
            shipId,
            partId,
            type: part.type
        });

        // Rembourser une partie de l'ancienne pièce si elle existe
        if (oldPart) {
            const refund = oldPart.price / 2n;
            await transfer(ship.owner, refund);
        }
    }

    // === Système de course ===

    async createRace(trackId, requiredLevel, entryFee) /* write */ {
        const track = this.tracks.get(trackId);
        asserts(track, "Circuit non trouvé");

        const raceId = this._generateRaceId();
        const race = new Race(raceId, trackId, requiredLevel, entryFee);
        this.races.set(raceId, race);

        this._emitEvent("RaceCreated", {
            raceId,
            trackId,
            requiredLevel,
            entryFee
        });
    }

    async joinRace(raceId, shipId) /* write */ {
        const ship = this._getAndVerifyShipOwnership(shipId);
        const race = this.races.get(raceId);
        asserts(race, "Course non trouvée");
        asserts(race.status === "REGISTERING", "Les inscriptions sont fermées");
        asserts(race.participants.size < race.maxParticipants, "Course complète");
        asserts(ship.level >= race.requiredLevel, "Niveau insuffisant");
        asserts(message.value >= race.entryFee, "Frais d'inscription insuffisants");

        race.participants.set(shipId, null);
        race.prizePool += race.entryFee;

        this._emitEvent("ShipJoinedRace", {
            raceId,
            shipId
        });

        // Démarrer la course si complète
        if (race.participants.size === race.maxParticipants) {
            await this._startRace(race);
        }
    }

    async _startRace(race) /* write */ {
        race.status = "STARTED";
        race.startTime = Date.now();

        const track = this.tracks.get(race.trackId);
        let positions = new Map(); // ShipID -> {distance, speed, shield}

        // Initialiser les positions
        for (const shipId of race.participants.keys()) {
            const ship = this.ships.get(shipId);
            positions.set(shipId, {
                distance: 0,
                speed: 0,
                shield: ship.getEffectiveStats().shield
            });
        }

        // Simuler la course
        while (![...positions.values()].some(p => p.distance >= track.length)) {
            const randomValue = await call(this.randomSource, "", "getRandomNumber", []);

            // Mise à jour pour chaque vaisseau
            for (const [shipId, position] of positions) {
                const ship = this.ships.get(shipId);
                const stats = ship.getEffectiveStats();

                // Calcul de la nouvelle vitesse (avec accélération)
                position.speed = Math.min(
                    position.speed + stats.acceleration,
                    stats.topSpeed
                );

                // Gestion des obstacles et bonus du segment actuel
                const segment = this._getCurrentSegment(track, position.distance);
                const { speedModifier, damage } = this._processSegmentEffects(
                    segment,
                    randomValue,
                    stats.handling
                );

                // Appliquer les effets
                position.speed *= speedModifier;
                position.shield = Math.max(0, position.shield - damage);

                // Si le bouclier est détruit, réduire la vitesse
                if (position.shield <= 0) {
                    position.speed *= 0.75;
                }

                // Mettre à jour la distance
                position.distance += position.speed;

                // Enregistrer l'événement
                race.events.push({
                    shipId,
                    distance: position.distance,
                    speed: position.speed,
                    shield: position.shield,
                    segment: segment.type
                });
            }
        }

        // Déterminer le classement final
        race.positions = [...positions.entries()]
            .sort((a, b) => b[1].distance - a[1].distance)
            .map(([shipId]) => shipId);

        // Distribuer les récompenses
        await this._distributeRacePrizes(race);

        race.status = "FINISHED";
        race.endTime = Date.now();

        this._emitEvent("RaceFinished", {
            raceId: race.id,
            positions: race.positions,
            events: race.events
        });
    }

    async _distributeRacePrizes(race) /* write */ {
        // Distribution du prize pool
        const prizeDistribution = [0.5, 0.3, 0.15, 0.05]; // 50%, 30%, 15%, 5%

        for (let i = 0; i < Math.min(race.positions.length, prizeDistribution.length); i++) {
            const shipId = race.positions[i];
            const ship = this.ships.get(shipId);
            const prize = (race.prizePool * BigInt(Math.floor(prizeDistribution[i] * 100))) / 100n;

            // Transférer les gains
            await transfer(ship.owner, prize);

            // Expérience gagnée basée sur la position
            const expGain = (4 - i) * 100; // 400, 300, 200, 100 XP
            ship.experience += expGain;

            // Vérifier le niveau
            await this._checkLevelUp(ship);
        }

        // Payer les paris gagnants
        await this._settleBets(race);
    }

    // === Système de paris ===

    async placeBet(raceId, shipId, amount) /* write */ {
        const race = this.races.get(raceId);
        asserts(race, "Course non trouvée");
        asserts(race.status === "REGISTERING", "Les paris sont fermés");
        asserts(race.participants.has(shipId), "Vaisseau non inscrit");
        asserts(message.value >= amount, "Montant insuffisant");

        let raceBets = this.bets.get(raceId) || new Map();
        let shipBets = raceBets.get(shipId) || [];

        shipBets.push({
            bettor: msg.sender,
            amount: BigInt(amount)
        });

        raceBets.set(shipId, shipBets);
        this.bets.set(raceId, raceBets);

        this._emitEvent("BetPlaced", {
            raceId,
            shipId,
            bettor: msg.sender,
            amount
        });
    }

    async _settleBets(race) /* write */ {
        const raceBets = this.bets.get(race.id);
        if (!raceBets) return;

        const winner = race.positions[0];
        const winningBets = raceBets.get(winner) || [];
        const totalBets = BigInt([...raceBets.values()]
            .flat()
            .reduce((sum, bet) => sum + bet.amount, 0n));

        if (totalBets === 0n || winningBets.length === 0) return;

        const totalWinningBets = BigInt(winningBets
            .reduce((sum, bet) => sum + bet.amount, 0n));

        // Distribuer les gains aux paris gagnants
        for (const bet of winningBets) {
            const share = (bet.amount * totalBets) / totalWinningBets;
            await transfer(bet.bettor, share);

            this._emitEvent("BetSettled", {
                raceId: race.id,
                bettor: bet.bettor,
                winnings: share
            });
        }
    }

    // === Getters et utilitaires ===

    _getCurrentSegment(track, distance) {
        const segmentLength = track.length / track.segments.length;
        const segmentIndex = Math.min(
            Math.floor(distance / segmentLength),
            track.segments.length - 1
        );
        return track.segments[segmentIndex];
    }

    _processSegmentEffects(segment, randomValue, handling) {
        let speedModifier = 1.0;
        let damage = 0;

        switch (segment.type) {
            case "ASTEROIDS":
                // Chance d'éviter basée sur le handling
                if ((randomValue % 100) > handling) {
                    speedModifier = 0.7;
                    damage = 20;
                }
                break;
            case "SPACE_DEBRIS":
                if ((randomValue % 100) > handling * 1.2) {
                    speedModifier = 0.8;
                    damage = 10;
                }
                break;
            case "SOLAR_WIND":
                speedModifier = 1.2;
                break;
            case "WORMHOLE":
                if ((randomValue % 100) < 20) {
                    speedModifier = 1.5; // Boost significatif
                }
                break;
        }

        return { speedModifier, damage };
    }

    _checkLevelUp(ship) {
        const expNeeded = ship.level * 500;
        if (ship.experience >= expNeeded && ship.level < 50) {
            ship.level++;
            ship.experience -= expNeeded;

            // Bonus de stats par niveau
            ship.acceleration *= 1.05;

            ship.topSpeed *= 1.05;
            ship.handling *= 1.05;
            ship.shield *= 1.05;

            this._emitEvent("ShipLevelUp", {
                shipId: ship.id,
                newLevel: ship.level
            });
        }
    }

    // === Marché des pièces ===

    async generateNewParts() /* write */ {
        asserts(msg.sender === this.owner, "Réservé à l'administrateur");

        const randomValue = await call(this.randomSource, "", "getRandomNumber", []);
        const numParts = 5 + (randomValue % 5); // 5-10 nouvelles pièces

        for (let i = 0; i < numParts; i++) {
            const partRandomValue = await call(this.randomSource, "", "getRandomNumber", []);
            const part = this._generateRandomPart(partRandomValue);
            this.partsMarket.set(part.id, part);

            this._emitEvent("NewPartAvailable", {
                partId: part.id,
                type: part.type,
                rarity: part.rarity,
                price: part.price
            });
        }
    }

    _generateRandomPart(randomValue) {
        const types = ["engine", "wings", "shield", "booster"];
        const rarities = ["common", "rare", "epic", "legendary"];
        const weights = [60, 30, 9, 1]; // Probabilités pour chaque rareté

        const type = types[randomValue % types.length];
        const rarity = this._weightedRandom(rarities, weights, randomValue);

        const stats = this._generatePartStats(type, rarity, randomValue);

        return new Part(
            this._generatePartId(),
            type,
            rarity,
            stats
        );
    }

    _generatePartStats(type, rarity, randomValue) {
        const rarityMultiplier = {
            common: 1,
            rare: 2,
            epic: 3.5,
            legendary: 5
        }[rarity];

        const baseStats = {
            engine: { acceleration: 10, topSpeed: 5 },
            wings: { handling: 15 },
            shield: { shield: 20 },
            booster: { acceleration: 5, topSpeed: 10 }
        }[type];

        const stats = {};
        for (const [stat, value] of Object.entries(baseStats)) {
            // Ajouter une variation aléatoire de ±20%
            const variation = 0.8 + ((randomValue % 40) / 100);
            stats[stat] = Math.floor(value * rarityMultiplier * variation);
        }

        return stats;
    }

    // === Système de circuits ===

    async createTrack(name, difficulty, length, segmentTypes) /* write */ {
        asserts(msg.sender === this.owner, "Réservé à l'administrateur");
        asserts(difficulty >= 1 && difficulty <= 10, "Difficulté invalide");
        asserts(length >= 1000 && length <= 10000, "Longueur invalide");
        asserts(segmentTypes.length >= 5, "Pas assez de segments");

        const trackId = this._generateTrackId();
        const segments = this._generateTrackSegments(segmentTypes, length);

        const track = new Track(trackId, name, difficulty, length, segments);
        this.tracks.set(trackId, track);

        this._emitEvent("TrackCreated", {
            trackId,
            name,
            difficulty
        });
    }

    _generateTrackSegments(segmentTypes, length) {
        const segments = [];
        const segmentLength = length / segmentTypes.length;

        for (const type of segmentTypes) {
            segments.push({
                type,
                length: segmentLength,
                effects: this._getSegmentEffects(type)
            });
        }

        return segments;
    }

    _getSegmentEffects(type) {
        switch (type) {
            case "ASTEROIDS":
                return {
                    riskLevel: 3,
                    maxDamage: 20,
                    speedPenalty: 0.3
                };
            case "SPACE_DEBRIS":
                return {
                    riskLevel: 2,
                    maxDamage: 10,
                    speedPenalty: 0.2
                };
            case "SOLAR_WIND":
                return {
                    speedBonus: 0.2,
                    duration: 5
                };
            case "WORMHOLE":
                return {
                    teleportChance: 0.2,
                    maxSkipDistance: 500
                };
            default:
                return {};
        }
    }

    // === Système de classement et récompenses ===

    async claimSeasonRewards() /* write */ {
        const season = this.currentSeason;
        asserts(season, "Aucune saison en cours");
        asserts(Date.now() >= season.startTime + season.duration,
            "La saison n'est pas terminée");

        const sender = lower(msg.sender);
        const leaderboard = season.getLeaderboard();
        const position = leaderboard.findIndex(([player]) => player === sender);

        let reward = 0n;
        if (position < 10) reward = season.rewards.top10;
        else if (position < 50) reward = season.rewards.top50;
        else if (position < 100) reward = season.rewards.top100;

        asserts(reward > 0n, "Pas de récompense à réclamer");

        await transfer(sender, reward);

        this._emitEvent("SeasonRewardsClaimed", {
            player: sender,
            position,
            reward
        });
    }

    // === Utilitaires ===

    _generateShipId() {
        return keccak256(encode(["uint256", "string"], [Date.now(), "SHIP"]));
    }

    _generateRaceId() {
        return keccak256(encode(["uint256", "string"], [Date.now(), "RACE"]));
    }

    _generatePartId() {
        return keccak256(encode(["uint256", "string"], [Date.now(), "PART"]));
    }

    _generateTrackId() {
        return keccak256(encode(["uint256", "string"], [Date.now(), "TRACK"]));
    }

    _weightedRandom(items, weights, randomValue) {
        const total = weights.reduce((a, b) => a + b, 0);
        let current = randomValue % total;

        for (let i = 0; i < items.length; i++) {
            if (current < weights[i]) return items[i];
            current -= weights[i];
        }

        return items[0];
    }

    // === Getters publics ===

    async getShip(shipId) {
        return this.ships.get(shipId);
    }

    async getRace(raceId) {
        return this.races.get(raceId);
    }

    async getTrack(trackId) {
        return this.tracks.get(trackId);
    }

    async getAvailableParts() {
        return Array.from(this.partsMarket.values());
    }

    async getActiveRaces() {
        return Array.from(this.races.values())
            .filter(race => race.status === "REGISTERING");
    }

    async getPlayerStats(address) {
        const player = this.players.get(lower(address));
        if (!player) return null;

        return {
            ships: Array.from(player.ships),
            totalRaces: player.totalRaces,
            seasonPoints: this.currentSeason?.playerPoints.get(address) || 0,
            ranking: this._getPlayerRanking(address)
        };
    }

    _getPlayerRanking(address) {
        if (!this.currentSeason) return null;

        const leaderboard = this.currentSeason.getLeaderboard();
        return leaderboard.findIndex(([player]) => player === address) + 1;
    }
}





class SeasonRanking {
    constructor() {
        this.playerPoints = new Map(); // Address -> Points
        this.startTime = Date.now();
        this.duration = 30 * 24 * 60 * 60 * 1000; // 30 jours
        this.rewards = {
            top10: BigInt(1e18),    // 1 ETH
            top50: BigInt(5e17),    // 0.5 ETH
            top100: BigInt(2e17)    // 0.2 ETH
        };
    }

    addPoints(player, points) {
        const currentPoints = this.playerPoints.get(player) || 0;
        this.playerPoints.set(player, currentPoints + points);
    }

    getLeaderboard() {
        return [...this.playerPoints.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 100);
    }
}



class Ship {
    constructor(id, owner, blueprint) {
        this.id = id;
        this.owner = owner;
        this.blueprint = blueprint;
        this.level = 1;
        this.experience = 0;
        this.races = 0;
        this.wins = 0;
        this.lastRace = 0;
        this.cooldown = 0;

        // Stats de base calculées depuis le blueprint
        const stats = this._calculateBaseStats(blueprint);
        this.acceleration = stats.acceleration;
        this.topSpeed = stats.topSpeed;
        this.handling = stats.handling;
        this.shield = stats.shield;

        // Pièces installées
        this.parts = {
            engine: null,
            wings: null,
            shield: null,
            booster: null
        };
    }

    getEffectiveStats() {
        // Combiner stats de base et bonus des pièces
        let effectiveStats = {
            acceleration: this.acceleration,
            topSpeed: this.topSpeed,
            handling: this.handling,
            shield: this.shield
        };

        for (const part of Object.values(this.parts)) {
            if (part) {
                effectiveStats.acceleration += part.stats.acceleration || 0;
                effectiveStats.topSpeed += part.stats.topSpeed || 0;
                effectiveStats.handling += part.stats.handling || 0;
                effectiveStats.shield += part.stats.shield || 0;
            }
        }

        return effectiveStats;
    }
}


class Race {
    constructor(id, trackId, requiredLevel, entryFee) {
        this.id = id;
        this.trackId = trackId;
        this.requiredLevel = requiredLevel;
        this.entryFee = BigInt(entryFee);
        this.participants = new Map(); // ShipID -> Position
        this.status = "REGISTERING"; // REGISTERING, STARTED, FINISHED
        this.startTime = null;
        this.endTime = null;
        this.positions = []; // Classement final
        this.prizePool = 0n;
        this.maxParticipants = 8;
        this.events = []; // Événements de course
    }
}


class Track {
    constructor(id, name, difficulty, length, segments) {
        this.id = id;
        this.name = name;
        this.difficulty = difficulty; // 1-10
        this.length = length; // en unités de distance
        this.segments = segments; // Segments avec obstacles et bonus
    }
}


class Part {
    constructor(id, type, rarity, stats) {
        this.id = id;
        this.type = type; // engine, wings, shield, booster
        this.rarity = rarity; // common, rare, epic, legendary
        this.stats = stats;
        this.price = this._calculatePrice();
    }

    _calculatePrice() {
        const rarityMultiplier = {
            common: 1,
            rare: 3,
            epic: 10,
            legendary: 50
        };
        return BigInt(1e16) * BigInt(rarityMultiplier[this.rarity]); // Base 0.01 ETH
    }
}




/*

Ce jeu de course spatiale comprend plusieurs mécaniques intéressantes :

Vaisseaux personnalisables :
- Système de pièces avec différentes raretés
- Stats uniques générées aléatoirement
- Système de niveau et d'expérience
- Possibilité d'améliorer son vaisseau


Courses dynamiques :
- Circuits avec différents segments (astéroïdes, débris spatiaux, etc.)
- Système de dégâts et de bouclier
- Effets aléatoires pendant la course
- Calcul de position en temps réel


Système économique :
- Paris sur les courses
- Marché de pièces détachées
- Récompenses de course
- Frais d'inscription


Compétition saisonnière :
- Classement des joueurs
- Récompenses saisonnières
- Points gagnés en course
- Différents niveaux de récompenses


Circuits variés :
- Segments avec effets spéciaux
- Différents niveaux de difficulté
- Obstacles et bonus
- Génération procédurale

Les joueurs peuvent donc :
- Créer et personnaliser leurs vaisseaux
- Participer à des courses
- Parier sur les résultats
- Améliorer leurs vaisseaux
- Gagner des récompenses
- Grimper dans le classement

*/