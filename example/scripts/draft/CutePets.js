// CutePets.js


class CutePets {
    constructor() {
        this.pets = new Map();  // ID -> Pet
        this.players = new Map();  // Address -> Player
        this.randomSource = null;
        this.lastDailyReset = Date.now();
    }

    // === Actions de base ===

    async adoptPet() /* write */ {
        const sender = lower(msg.sender);
        const player = this._getOrCreatePlayer(sender);

        // Chaque joueur peut avoir jusqu'à 5 pets
        asserts(player.pets.size < 5, "Tu as déjà beaucoup d'amis à t'occuper !");

        // L'adoption coûte un peu d'ETH
        asserts(message.value >= this._getAdoptionPrice(),
            "Il faut un peu plus d'ETH pour adopter un ami");

        // Choisir un type de pet aléatoire
        const randomValue = await call(this.randomSource, "", "getRandomNumber", []);
        const petType = this._getRandomPetType(randomValue);

        const petId = this._generatePetId();
        const pet = new Pet(petId, sender, petType);
        this.pets.set(petId, pet);
        player.pets.add(petId);

        this._emitEvent("PetAdopted", {
            owner: sender,
            petId,
            type: petType
        });

        return petId;
    }

    async namePet(petId, newName) /* write */ {
        const pet = this._getAndVerifyPetOwnership(petId);

        // Vérifier que le nom est approprié (lettres, chiffres et espaces)
        asserts(/^[a-zA-Z0-9 ]{1,20}$/.test(newName),
            "Le nom doit faire moins de 20 caractères et ne contenir que des lettres et chiffres");

        pet.name = newName;

        this._emitEvent("PetNamed", {
            petId,
            name: newName
        });
    }

    async feedPet(petId) /* write */ {
        const pet = this._getAndVerifyPetOwnership(petId);
        const player = this.players.get(pet.owner);

        asserts(player.treats > 0, "Tu n'as plus de friandises ! Attends demain pour en avoir d'autres");

        player.treats--;
        pet.hunger = Math.max(0, pet.hunger - 30);
        pet.happiness = Math.min(100, pet.happiness + 10);
        pet.lastFed = Date.now();

        this._emitEvent("PetFed", {
            petId,
            newHunger: pet.hunger,
            newHappiness: pet.happiness
        });
    }

    async petPet(petId) /* write */ {
        const pet = this._getAndVerifyPetOwnership(petId);

        // On peut caresser son pet toutes les heures
        asserts(Date.now() > pet.lastPetted + 3600000,
            "Ton ami a besoin d'un peu de repos ! Réessaie dans une heure");

        pet.happiness = Math.min(100, pet.happiness + 20);
        pet.lastPetted = Date.now();

        this._emitEvent("PetPetted", {
            petId,
            newHappiness: pet.happiness
        });
    }

    // === Accessoires et personnalisation ===

    async buyAccessory(accessoryId) /* write */ {
        const sender = lower(msg.sender);
        const player = this._getOrCreatePlayer(sender);
        const accessory = this._getAccessory(accessoryId);

        asserts(message.value >= accessory.price,
            "Tu n'as pas assez d'ETH pour cet accessoire");

        player.accessories.add(accessoryId);

        this._emitEvent("AccessoryBought", {
            player: sender,
            accessoryId
        });
    }

    async equipAccessory(petId, accessoryId) /* write */ {
        const pet = this._getAndVerifyPetOwnership(petId);
        const player = this.players.get(pet.owner);

        asserts(player.accessories.has(accessoryId),
            "Tu n'as pas cet accessoire");
        asserts(pet.accessories.length < 3,
            "Ton ami a déjà beaucoup d'accessoires !");

        pet.accessories.push(accessoryId);
        pet.happiness = Math.min(100, pet.happiness + 5);

        this._emitEvent("AccessoryEquipped", {
            petId,
            accessoryId
        });
    }

    // === Interactions sociales ===

    async makeFriends(petId1, petId2) /* write */ {
        const pet1 = this._getAndVerifyPetOwnership(petId1);
        const pet2 = this.pets.get(petId2);
        asserts(pet2, "Ce pet n'existe pas");

        // Les pets peuvent avoir jusqu'à 3 amis
        asserts(pet1.friends.size < 3, "Ton ami a déjà beaucoup d'amis !");
        asserts(pet2.friends.size < 3, "Cet ami a déjà beaucoup d'amis !");

        pet1.friends.add(petId2);
        pet2.friends.add(petId1);

        // Les pets sont plus heureux avec des amis !
        pet1.happiness = Math.min(100, pet1.happiness + 15);
        pet2.happiness = Math.min(100, pet2.happiness + 15);

        this._emitEvent("PetsFriends", {
            pet1: petId1,
            pet2: petId2
        });
    }

    // === Système de temps et maintenance ===

    async updatePetStatus() /* write */ {
        // Mettre à jour le statut de tous les pets
        for (const pet of this.pets.values()) {
            const timeSinceLastFed = Date.now() - pet.lastFed;

            // Augmenter la faim avec le temps
            pet.hunger = Math.min(100,
                pet.hunger + Math.floor(timeSinceLastFed / 3600000) * 10);

            // Diminuer le bonheur si le pet a faim
            if (pet.hunger > 70) {
                pet.happiness = Math.max(0,
                    pet.happiness - Math.floor(timeSinceLastFed / 3600000) * 5);
            }
        }

        // Donner des friandises quotidiennes
        if (Date.now() > this.lastDailyReset + 86400000) {
            for (const player of this.players.values()) {
                player.treats = Math.min(player.treats + 10, 30);
            }
            this.lastDailyReset = Date.now();
        }
    }

    // === Utilitaires ===

    _getOrCreatePlayer(address) {
        let player = this.players.get(address);
        if (!player) {
            player = new Player(address);
            this.players.set(address, player);
        }
        return player;
    }

    _getAndVerifyPetOwnership(petId) {
        const pet = this.pets.get(petId);
        asserts(pet, "Ce pet n'existe pas");
        asserts(pet.owner === msg.sender, "Ce n'est pas ton ami !");
        return pet;
    }

    _getRandomPetType(randomValue) {
        const types = ["PUPPY", "KITTY", "BUNNY", "HAMSTER", "PENGUIN"];
        return types[randomValue % types.length];
    }

    _getAdoptionPrice() {
        return BigInt(1e16); // 0.01 ETH
    }

    _generatePetId() {
        return keccak256(encode(["uint256", "string"], [Date.now(), "PET"]));
    }

    // === Getters ===

    async getPet(petId) {
        return this.pets.get(petId);
    }

    async getPlayerPets(address) {
        const player = this.players.get(lower(address));
        if (!player) return [];
        return Array.from(player.pets)
            .map(petId => this.pets.get(petId))
            .filter(pet => pet);
    }

    async getPlayerStats(address) {
        const player = this.players.get(lower(address));
        if (!player) return null;
        return {
            treats: player.treats,
            accessories: Array.from(player.accessories),
            petCount: player.pets.size
        };
    }
}



// === Structures de données ===

class Pet {
    constructor(id, owner, type) {
        this.id = id;
        this.owner = owner;
        this.type = type;  // "PUPPY", "KITTY", "BUNNY", "HAMSTER", "PENGUIN"
        this.name = "";
        this.happiness = 100;
        this.hunger = 0;
        this.lastFed = Date.now();
        this.lastPetted = Date.now();
        this.accessories = [];  // Chapeaux, lunettes, etc.
        this.friends = new Set();  // Autres pets amis
    }

    // Retourne l'humeur actuelle du pet
    getMood() {
        if (this.happiness > 80 && this.hunger < 20) return "SUPER_HAPPY";
        if (this.happiness > 50 && this.hunger < 50) return "HAPPY";
        if (this.hunger > 80) return "HUNGRY";
        if (this.happiness < 30) return "SAD";
        return "NORMAL";
    }
}


class Player {
    constructor(address) {
        this.address = address;
        this.pets = new Set();
        this.treats = 10;  // Friandises pour nourrir les pets
        this.accessories = new Set();
        this.lastDailyTreats = 0;
    }
}




/*

Ce jeu est conçu pour être simple et amusant pour les enfants avec :

Des mécaniques simples :
- Adopter des animaux mignons (chiens, chats, lapins...)
- Donner des noms aux animaux
- Les nourrir avec des friandises
- Les câliner pour les rendre heureux
- Leur mettre des accessoires (chapeaux, lunettes...)
- Les faire devenir amis entre eux


Des systèmes faciles à comprendre :
- Score de bonheur (0-100)
- Niveau de faim (0-100)
- Maximum de 5 animaux par joueur
- 10 friandises gratuites chaque jour
- Maximum 3 accessoires par animal
- Maximum 3 amis par animal


Des protections pour les enfants :
- Validation des noms (pas de caractères spéciaux)
- Coûts très bas pour l'adoption (0.01 ETH)
- Pas de système de combat ou de compétition
- Pas de perte possible des animaux
- Limites sur le nombre d'actions par jour


Des éléments amusants :
- Différentes humeurs des animaux
- Messages amicaux dans les erreurs
- Récompenses quotidiennes
- Collection d'accessoires
- Système d'amitié entre animaux

C'est un peu comme un Tamagotchi mais en plus social et sans le risque que l'animal meure si on ne s'en occupe pas !

*/

