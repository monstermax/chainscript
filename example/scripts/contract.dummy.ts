

/* ######################################################### */

//              /!\ INFORMATION /!\

// Ce fichier est optionnel. Il n'est pas utilisé par la blockchain.

// Il a pour unique but que votre IDE ait connaissance des variables et fonction disponibles dans un smart contrat JS.

// Note: pensez à mettre `"exclude": ["example/"]` dans `tsconfig.json` afin que le reste du projet ne doit pas affecté par ces variables globales.

/* ######################################################### */


type HexNumber = `0x${string}`;
type AccountAddress = HexNumber;
type BlockHash = HexNumber;

type Block = any;
type Account = any;
type ContractMemory = any;
type BytesLike = any;
type ParamType = any;


/* ######################################################### */


// "sandboxData" variables

/** Nombre de decimals de la monnaie native de la Blockchain - DEPPRECATED => use chain.decimals */
//const decimals = 18; // must be equals to config.ts value

/** Nombre de micro unités dans 1 unité entière de la monnaie native (aka bitcoin vs satoshi) - DEPPRECATED => use chain.fullcoin */
//const fullcoin: bigint = BigInt(Math.pow(10, decimals));

/** Adresse de l'utilisateur qui effectue la transaction - DEPPRECATED => use msg.sender */
//const caller: AccountAddress = '0x0000000000000000000000000000000000000000';

{
/** Adresse du smart contract */
const self: AccountAddress = '0x0000000000000000000000000000000000000000';
}

/** Message informationnel contenant l'emetteur de la transaction et la valeur monetaire */
const msg: { sender: AccountAddress, value: bigint } = { sender: '0x0000000000000000000000000000000000000000', value: 0n };

/** Message informationnel contenant les informations sur le block en construction */
const block: { blockHeight: number, parentBlockHash: HexNumber } = { blockHeight: 0, parentBlockHash: '0x' };

/** Message informationnel contenant les informations sur la blockchain */
const chain: { decimals: number, fullcoin: bigint } = { decimals: 18, fullcoin: BigInt(Math.pow(10, 18)) };



// "sandboxUtils" methods

/** Permet d'afficher des informations de debug sur la console du serveur */
function log(...text: any[]): void {};

/** Transfert un montant donné au destinataire indiqué */
async function transfer(to: AccountAddress, amount: bigint): Promise<void> {};

/** Appelle un autre smart contrat (on-chain) */
async function call(calledScriptAddress: AccountAddress, calledScriptClass: string, calledScriptMethod: string, args: any[]): Promise<void> {};

/** Retourne le solde d'un compte */
function balanceOf(address: AccountAddress): bigint { return 0n; };

/** Permet de stocker des informations sur la Blockchain */
//function memory(initialValues: ContractMemory): ContractMemory { return {} };

/** Retourne une erreur si la condition n'est pas satisfaite */
function asserts(condition: boolean, message?: string): asserts condition {};

/** Déclenche une exception et stoppe la transaction courante */
function revert(message?: string): never { throw new Error(); };

/** Calcul le hash d'une chaine */
function hash(dataToHash: string): string { return ''; };

/** Fonction de hachage */
function keccak256(_data: BytesLike): string { return '' };

/** Génère un nombre aléatoire */
function random(): number { return 0 };

function encode(types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>): string { return '' };

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

