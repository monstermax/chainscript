

# smart contrat en Javascript :

## Consignes

- tous les parametres des methodes publiques doivent etre des string
- nous utilisons les string car c'est le plus compatible avec le format d'ABI Ethereum et ainsi conserver une compatibilité avec Metamask.
- les montants manipulés doivent etre des bigint et sont exprimés en unité insécable (comme le satoshi sur Bitcoin)
- à la sortie de la blockchain, le RPC s'occupe de formatter le résultat d'un "eth_call" en string, afin que ca passe au format ABI Ethereum puis à Metamask.
- les méthodes et variables privées sont préfixées d'un #

## Fonctions disponibles :
- balance()
- asserts()
- revert()
- lower()
- upper()
- log()
- transfer()
- call()
- hash()

## Variables disponibles :
- self
- msg: { value, sender }
- block: { blockHeight, parentBlockHash }
- chain: { decimals, fullcoin }




# interactions web3 depuis le navigateur :

## Consignes

- tous les parametres des methodes des smarts contrats doivent etre formattés en string.
- tous les resultats des "eth_call" sont des string. il faut parfois parser le json obtenu.
- les montants manipulés doivent etre des bigint et sont exprimés en unité insécable (comme le satoshi sur Bitcoin)







--




# SMART CONTRACT JAVASCRIPT GUIDELINES

## Method Modifiers
1. /* write */
   - Indique une méthode qui modifie l'état
   - Nécessite une transaction (génère un hash de transaction)
   - Coûte du gas
   - Peut être async
   - Comportement des retours :
     * PEUT retourner une valeur native (BigInt, boolean, etc.)
     * Ces retours sont utilisables entre contrats
     * Les retours ne sont pas visibles dans la transaction finale
     * Pas besoin de conversion en string pour les retours

2. /* payable */
   - Indique une méthode qui peut recevoir des fonds
   - Automatiquement /* write */
   - Accès à msg.value
   - Doit gérer les fonds reçus

3. Pas de modifier (view)
  * S'applique à toute méthode sans /* write */ ou /* payable */
  * Accès en lecture seule à l'état
  * Ne coûte pas de gas
  * Peut être async

## Data Type Rules
- INPUT: All public method parameters must be strings
- OUTPUT: All method returns must be strings (for Ethereum ABI compatibility)
- AMOUNTS: Must use BigInt for all monetary values, expressed in minimal units
- INTERNAL: Can use native types inside private methods

## Environment Context

### Available Functions
```javascript
balance(address): BigInt            // Get address's balance
asserts(condition: boolean, message?: string): void  // Throw if condition is false
revert(message: string): void // Throw with message
lower(string): string        // Convert to lowercase
upper(string): string        // Convert to uppercase
log(message: string): void   // Log message
transfer(to: string, amount: BigInt): Promise<void>  // Transfer funds
call(contract: string, className: string, method: string, params: string[]): Promise<string>  // Call other contract
hash(data: string): string   // Hash data
```

### Global Variables
```javascript
self: string                 // Current contract address
msg: {
    value: BigInt,          // Amount of coins sent
    sender: string          // Transaction sender address
}
block: {
    blockHeight: number,    // Current block number
    parentBlockHash: string // Previous block hash
}
chain: {
    decimals: number,       // Number of decimal places
    fullcoin: BigInt        // Value of one full coin
}
```

## Validation Rules
1. Public methods:
   - MUST accept only string parameters
   - CAN return any type (le RPC se chargera de la conversion au format ABI)

2. Amount handling:
   - MUST use BigInt for all calculations
   - MUST handle amounts in minimal units
   - MUST validate amounts before operations

## Examples
```javascript

class Contract {
    value = 0n;

    // ✅ Correct - Peut retourner une valeur même en write
    async setValue(newValue) /* write */ {
        const oldValue = this.value;
        this.value = BigInt(newValue);
        return oldValue; // OK - visible en inter-contrat, pas dans la tx
    }

    // ✅ Correct - Utilisation du retour d'une méthode write
    async processValue() /* write */ {
        const oldValue = await call("OtherContract", "", "setValue", ["42"]); 
        // oldValue est accessible ici
        return BigInt(oldValue);
        // La transaction finale ne contiendra pas de retour
    }

    // ✅ Correct - Méthode payable avec retour
    deposit() /* payable */ {
        this.value += msg.value;
        return msg.value; // OK - visible en inter-contrat
    }

    balance() {
        return balance(self);
    }
}

```




# WEB3 BROWSER INTERACTION GUIDELINES

## Data Handling Rules
1. Smart Contract Calls:
   - INPUT: All parameters must be formatted as strings
   - OUTPUT: All eth_call results are strings
   - JSON: Parse returned JSON when needed

2. Amount Processing:
   - MUST use BigInt for calculations
   - MUST handle minimal units
   - MUST format display values appropriately

## Examples
```javascript
// CORRECT
const amount = "1000000000000000000"; // 1 ETH in wei
const result = await contract.methods.transfer(address, amount).call();
const parsedResult = BigInt(result);

// INCORRECT
const amount = 1.0; // Don't use floating point
const result = await contract.methods.transfer(address, amount).call();
```

## Validation Checklist
- [ ] All method parameters are strings
- [ ] BigInt used for all amount calculations
- [ ] Results properly parsed from strings
- [ ] Amounts handled in minimal units
- [ ] Display values properly formatted for users



