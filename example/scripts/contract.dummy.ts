

/* ######################################################### */

//              /!\ INFORMATION /!\

// Ce fichier est optionnel. Il n'est pas utilisé par la blockchain.

// Il a pour unique but que votre IDE ait connaissance des variables et fonction disponibles dans un smart contrat JS.

// Note: pensez à mettre `"exclude": ["example/"]` dans `tsconfig.json` afin que le reste du projet ne doit pas affecté par ces variables globales.

/* ######################################################### */


type HexString = `0x${string}`;
type AccountAddress = HexString;
type BlockHash = HexString;

type Block = any;
type Account = any;
type ContractMemory = any;


/* ######################################################### */


// "sandboxData" variables

/** Nombre de decimals de la monnaie native de la blockchain */
const decimals = 18; // must be equals to config.ts value

/** Nombre de micro unités dans 1 unité entière de la monnaie native (aka bitcoin vs satoshi) */
const fullcoin: bigint = BigInt(Math.pow(10, decimals));

/** Adresse de l'utilisateur qui effectue la transaction */
const caller: AccountAddress = '0x0000000000000000000000000000000000000000';

{
/** Adresse du smart contract */
const self: AccountAddress = '0x0000000000000000000000000000000000000000';
}


// "sandboxUtils" methods

/** Permet d'afficher des informations de debug sur la console du serveur */
function log(...text: any[]): void {};

/** Transfert un montant donné au destinataire indiqué */
async function transfer(to: AccountAddress, amount: bigint): Promise<void> {};

/** Appelle un autre smart contrat (on-chain) */
async function call(calledScriptAddress: AccountAddress, calledScriptClass: string, calledScriptMethod: string, args: any[]): Promise<void> {};

/** Retourne le solde d'un compte */
function balance(address: AccountAddress): bigint { return 0n; };

/** Permet de stocker des informations sur la Blockchain */
//function memory(initialValues: ContractMemory): ContractMemory { return {} };

/** Retourne une erreur si la condition n'est pas satisfaite */
function asserts(condition: boolean, message?: string): asserts condition {};

/** Déclenche une exception et stoppe la transaction courante */
function revert(message?: string): never { throw new Error(); };

/** Calcul le hash d'une chaine */
function hash(dataToHash: string): string { return ''; };

/** Convertit une chaine en minuscule */
function lower(str: string): string { return ''; };

/** Convertit une chaine en majuscule */
function upper(str: string): string { return ''; };

/** Retourne un block extrait de la Blockchain */
function getBlock(blockHeight: number): Block { return {}; };

/** Retourne le hash du block de hauteur N */
function getBlockHash(blockHeight: number): BlockHash { return '0x'; };

/** Retourne la hauteur du block ayant le hash indiqué */
function getBlockHeight(blockHash: BlockHash): number | null { return 0 };

/** Retourne un block extrait de la Blockchain */
function getBlockByHash(blockHash: BlockHash): Block { return {}; };

