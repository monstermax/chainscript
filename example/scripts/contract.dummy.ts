

type HexString = `0x${string}`;
type AccountAddress = HexString;
type BlockHash = HexString;

type Block = any;
type Account = any;
type ContractMemory = any;

/* ######################################################### */


// "sandboxData" variables
const decimals = 18; // must be equals to config.ts value
const fullcoin: bigint = BigInt(Math.pow(10, decimals));

const caller: AccountAddress = '0x0000000000000000000000000000000000000000';
const address: AccountAddress = '0x0000000000000000000000000000000000000000';


// "sandboxUtils" methods
function log(...text: any[]): void {};

function balance(address: AccountAddress): bigint { return 0n; };

async function transfer(to: AccountAddress, amount: bigint): Promise<void> {};

async function call(calledScriptAddress: AccountAddress, calledScriptClass: string, calledScriptMethod: string, args: any[]): Promise<void> {};

function memory(initialValues: ContractMemory): ContractMemory { return {} };

function asserts(condition: boolean, message?: string): asserts condition {};

function getBlock(blockHeight: number): Block { return {}; }
function getBlockHash(blockHeight: number): BlockHash { return '0x'; }
function getBlockByHash(blockHash: BlockHash): Block { return {}; }

