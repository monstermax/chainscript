// vm.ts

import fs from 'fs';
import { Context, createContext, Script } from "vm"; // https://nodejs.org/api/vm.html

import { asserts, computeStrHash, getOpt, hasOpt, jsonReviver, stringifyParams } from "../helpers/utils";
import { decimals, fullcoin } from '../config';
import { Blockchain } from '../blockchain/blockchain';
import { MemoryState } from "../blockchain/stateManager";

import type { AccountAddress, CodeAbiClass, CodeAbiClassAttribute, CodeAbiClassMethod, ContractMemory } from "../types/account.types";
import type { BlockData, BlockHash } from "../types/block.types";
import { buildAbi, getClassProperties, getFunctionParams } from './abi';
import { AbiCoder, BytesLike, keccak256, ParamType } from 'ethers';



/* ######################################################### */

type VmMonitor = {
    totalCalls: number;         // Nombre total d'appels
    gasUsed: bigint;            // Prédiction de gasUsed (TODO)
    callStack: string[];        // Stack des appels (utile pour debugging)
    execId: number;
    context: Context | null;
}


export async function execVm(
    blockchain: Blockchain,
    caller: AccountAddress,
    contractAddress: AccountAddress,
    className: string,
    methodName: string,
    methodArgs: string[],
    memoryState: MemoryState | null,
    instructionAmount=0n,
    vmMonitor?: VmMonitor,
): Promise<{ vmResult: any | null, vmMonitor: VmMonitor, vmError: any | null }> {

    if (!vmMonitor) {
        vmMonitor = {
            totalCalls: 0,
            gasUsed: 0n,
            callStack: [],
            execId: Math.round(Math.random()*9999999),
            context: null,
        };
    }

    console.log(`[execVm] txSigner = ${caller} | script: ${contractAddress} | class = ${className} | method = ${methodName}`)


    // Mise à jour du moniteur
    vmMonitor.totalCalls++;
    vmMonitor.gasUsed++;  // Pour l'instant, 1 appel = 1 gas


    // Vérifier si le gas est suffisant (future implémentation)
    // if (vmMonitor.gasUsed > gasLimit) throw new Error(`[execVm] Gas limit exceeded`);


    // Vérifications standard
    asserts(contractAddress && contractAddress.startsWith('0x'), "[execVm] missing contract address");

    const contractAccount = blockchain.getAccount(contractAddress, memoryState);
    asserts(contractAccount.abi, `[execVm] L'account ${contractAddress} n'est pas un smart contract !`);
    asserts(contractAccount.code, `[execVm] missing contract code at address ${contractAddress}`);
    asserts(contractAccount.memory, `[execVm] missing contract memory at address ${contractAddress}`);


    const abiClass: CodeAbiClass | null = className ? (contractAccount.abi?.find(classAbi => classAbi.class === className) ?? null) : contractAccount.abi[0];
    asserts(abiClass, `[execVm] missing abi contract class`);
    className = className || abiClass.class;

    const abiClassAttribute: CodeAbiClassAttribute = abiClass.attributes[methodName];
    const abiClassMethod: CodeAbiClassMethod = abiClass.methods[methodName];

    const inputTypes = (abiClassMethod && abiClassMethod.inputs) ? abiClassMethod.inputs.map(name => "string").join(",") : [];
    const signatureString = `${methodName}(${inputTypes})`;


    // Vérifier si l’ABI contient la classe demandée
    asserts(abiClassMethod || abiClassAttribute, `[execVm] La méthode "${methodName}" n'existe pas dans "${className}" !`);

    // Vérifier que les arguments correspondent
    if (abiClassMethod) {
        const inputs = abiClassMethod.inputs ?? [];
        asserts(inputs.length === methodArgs.length, `[execVm] La méthode "${methodName}" attend ${inputs.length} arguments, mais ${methodArgs.length} ont été fournis !`);
    }




    // Ajout à la stack d'exécution
    vmMonitor.callStack.push(signatureString);


    // Charge et execute le code dans la VM

    try {
        const callStack = vmMonitor.callStack.length;

        const contractMemory: ContractMemory = { ...contractAccount.memory };
        //const contractMemoryWrapper = { memory: contractMemory };


        const getInstanceAndMemory = function(classPrototype: object) {
            // Désérialise la mémoire en utilisant `jsonReviver`
            //const contractMemory = JSON.parse(serializedMemory, jsonReviver);

            // Charge une instance du contrat sans appeler le constructeur
            const instance = Object.create(classPrototype);
            //instance.prototype = classPrototype;
            Object.assign(instance, contractMemory);

            return instance;
        }

        const saveInstanceMemory = function (instance: any) {
            Object.assign(contractMemory, instance);
        }


        // Créé un contexte d'exécution sandbox
        const sandbox = createExecutionSandbox(blockchain, caller, contractAddress, vmMonitor, memoryState, instructionAmount);

        const vmContext = createContext( {  ...sandbox, __getInstanceAndMemory: getInstanceAndMemory, __saveInstanceMemory: saveInstanceMemory } )
        //console.log('vmContext:', vmContext)


        // Note: voir si on pourrait pas accepter un contractCode écrit en Typescript et en le transcodant via new Function(contractCode).toString()
        let contractCode: string = contractAccount.code;


        if (true) {
            // DEBUG

            const contractAlias = getOpt(`--${contractAddress}`);

            if (contractAlias && fs.existsSync(contractAlias)) {
                contractCode = fs.readFileSync(contractAlias).toString();
            }
        }


        let executeCode: string = `
// Code du contrat
${contractCode}

// Charge une instance du contrat sans appeler le contructeur
const instance = __getInstanceAndMemory(${className}.prototype);


${abiClassAttribute ? `
// Appelle l'attribut demandé
const __result = instance.${methodName};

// Retourne le resultat
__result;

` : `
// Appelle la methode demandée avec les parametres fournis
${hasOpt('--debug-contract') ? "debugger;" : ""}
const __result = instance.${methodName}(${stringifyParams(methodArgs)});

// Sauvegarde les attributs de l'instance et retourne le resultat
if (__result instanceof Promise) {
    __result.then((resolvedValue) => {
        __saveInstanceMemory(instance);
        return resolvedValue;
    });

} else {
    __saveInstanceMemory(instance);
    __result;
}

`}

`;

        let executionTimeout: number | undefined = 100;

        if (hasOpt('--debug-vm') || hasOpt('--debug-contract')) {
            const debugFilepath = `/tmp/debug_execute_contract_${contractAddress}.js`;

            executeCode = `
//${hasOpt('--debug-contract') ? "debugger;" : ""}

${executeCode}

//# sourceURL=file://${debugFilepath}
`;

            fs.writeFileSync(debugFilepath, executeCode);
            executionTimeout = undefined;
        }

        // Instancie le script pour la VM
        const executeScript: Script = new Script(executeCode);

        if (callStack === 1 && memoryState) {
            //console.log('Contract memory avant exécution:', contractAccount.memory)
        }

        // Execute la methode demandée et retourne le résultat
        const vmResult = await executeScript.runInContext(vmContext, { breakOnSigint: true, timeout: executionTimeout });
        //console.log(`[execVm] ✅ Résultat de ${signatureString}:`, vmResult);

        Object.assign(contractAccount.memory, contractMemory);

        if (callStack === 1 && memoryState) {
            //console.log('Contract memory après exécution:', contractAccount.memory);
        }

        return { vmResult, vmMonitor, vmError: null };

    } catch (vmError: any) {
        return { vmResult: null, vmMonitor, vmError };
    }
}




/** Créé un environnement sandbox pour la VM */
export function createExecutionSandbox(blockchain: Blockchain, caller: AccountAddress, contractAddress: AccountAddress, vmMonitor: VmMonitor, memoryState: MemoryState | null, instructionAmount=0n): { [methodOrVariable: string]: any } {
    let randomNonce = 0;
    const parentBlockHash = blockchain.stateManager.blocksIndex.at(-1);
    const blockHeight = blockchain.blockHeight;

    // Prépare le contexte d'exécution
    const sandboxUtils /* : { [method: string]: Function } */ = {
        log: console.log,

        transfer: async (to: AccountAddress, amount: bigint): Promise<void> => {
            console.log(`[createExecutionSandbox][transfer] => from = ${contractAddress} | to = ${to} | amount = ${amount}`)
            blockchain.transfer(contractAddress, to, amount, memoryState);
        },

        call: async (callContractAddress: AccountAddress, callClassName: string, callMethodName: string, callArgs: any[]): Promise<any> => {
            const caller = contractAddress;
            console.log(`[createExecutionSandbox][subcall] => caller = ${caller} | script = ${callContractAddress} | class = ${callClassName} | method = ${callMethodName}`)

            asserts(typeof callContractAddress === 'string' && callContractAddress.startsWith('0x') && callContractAddress.length === 42, `Invalid contract address "${callContractAddress}"`);

            const { vmResult, vmError } = await execVm(blockchain, caller, callContractAddress, callClassName, callMethodName, callArgs, memoryState, 0n, vmMonitor);

            if (vmError) {
                throw new Error(vmError);
            }
            return vmResult;
        },

        balanceOf: (address: AccountAddress) => {
            return blockchain.getAccount(address, memoryState)?.balance ?? 0n;
        },

        asserts,

        //emit, // TODO: gérer les events/logs

        revert: (message?: string) => { throw new Error(message ?? "Reverted") },

        hash: computeStrHash,

        keccak256,

        random: () => {
            const hash = computeStrHash(`${parentBlockHash}-${vmMonitor.totalCalls}-${randomNonce++}`);
            return 1 / Math.log(Number(BigInt(hash) % BigInt(Number.MAX_SAFE_INTEGER)))
        },

        encode: (types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>) => {
            const coder = new AbiCoder();
            return coder.encode(types, values);
        },

        lower: (str: string): string => str.toLowerCase(),

        upper: (str: string): string => str.toUpperCase(),

        getBlock: (blockHeight: number): BlockData | null => {
            return blockchain.getBlock(blockHeight)?.toData() ?? null;
        },

        getBlockHash: (blockHeight: number): BlockHash | null => {
            return blockchain.getBlock(blockHeight)?.hash ?? null;
        },

        getBlockHeight: (blockHash: BlockHash): number | null => {
            return blockchain.getBlockHeight(blockHash) ?? null;
        },

        getBlockByHash: (blockHash: BlockHash): BlockData | null => {
            return blockchain.getBlockByHash(blockHash)?.toData() ?? null;
        },
    }

    const sandboxData /* : { [method: string]: any } */ = {
        self: contractAddress,
        caller, // a déprecier
        decimals, // a déprecier
        fullcoin, // a déprecier
        block: { blockHeight, parentBlockHash },
        msg: { value: instructionAmount, sender: caller },
        chain: { decimals, fullcoin },
    }

    const sandboxExecUtils = {
        jsonReviver,
    }

    const sandbox: { [methodOrVariable: string]: any } = {
        ...sandboxUtils,
        ...sandboxData,
        ...sandboxExecUtils,

        // Note: penser à mettre à jour `createSandboxMock()` ET `contract.dummy.ts` en cas de modification de sandboxUtils ou sandboxData
    };

    Object.defineProperty(sandbox, 'constructor', { value: undefined });
    Object.defineProperty(sandbox, 'this', { value: undefined });

    return sandbox;
}



/** Ce mock sert uniquement lors du déploiement du contrat, pour générer l'Abi */
export function createDeploymentSandbox(caller: AccountAddress, contractAddress: AccountAddress = '0x'): { [methodOrVariable: string]: any } {
    const account = { memory: {} };

    const sandboxUtils: { [method: string]: Function } = {
        log: console.log,

        transfer: async (to: any, amount: bigint): Promise<void> => { throw new Error(`Not available in deploy`) },

        call: async (callContractAddress: any, callClassName: string, callMethodName: string, callArgs: any[]): Promise<any> => { throw new Error(`Not available in deploy`) },

        balanceOf: (address: any) => { throw new Error(`Not available in deploy`) },

        asserts,

        revert: (message?: string) => { throw new Error(message ?? "Reverted") },

        hash: computeStrHash,

        keccak256: (_data: BytesLike) => { throw new Error(`Not available in deploy`) },

        random: (): string => { return '' },

        encode: (types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>) => { throw new Error(`Not available in deploy`) },

        lower: (str: string): string => str.toLowerCase(),

        upper: (str: string): string => str.toUpperCase(),

        getBlock: (blockHeight: number) => { throw new Error(`Not available in deploy`) },

        getBlockHash: (blockHeight: number) => { throw new Error(`Not available in deploy`) },

        getBlockHeight: (blockHash: any) => { throw new Error(`Not available in deploy`) },

        getBlockByHash: (blockHash: any) => { throw new Error(`Not available in deploy`) },
    }

    const sandboxData: { [method: string]: any } = {
        self: contractAddress,
        caller,
        decimals: 0,
        fullcoin: 0n,
        block: { blockHeight: 0, parentBlockHash: '0x' },
        msg: { value: 0n, sender: caller },
        chain: { decimals, fullcoin },
    }

    const sandboxDeployUtils = {
        jsonReviver,
        getClassProperties,
        getFunctionParams,
        buildAbi,
    }

    const sandbox: { [methodOrVariable: string]: any } = {
        ...sandboxUtils,
        ...sandboxData,
        ...sandboxDeployUtils,
    };

    Object.defineProperty(sandbox, 'constructor', { value: undefined });
    Object.defineProperty(sandbox, 'this', { value: undefined });

    return sandbox;
}


