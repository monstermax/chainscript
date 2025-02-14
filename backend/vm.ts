// vm.ts

import { createContext, Script } from "vm"; // https://nodejs.org/api/vm.html

import { asserts, computeStrHash, stringifyParams } from "./utils";
import { decimals, fullcoin } from './config';
import { Blockchain } from './blockchain';
import { MemoryState } from "./stateManager";

import type { AccountAddress, CodeAbiClass, CodeAbiClassMethod, ContractMemory } from "./types/account.types";
import type { BlockData, BlockHash } from "./types/block.types";



/* ######################################################### */

type VmMonitor = {
    totalCalls: number;         // Nombre total d'appels
    gasUsed: bigint;            // Prédiction de gasUsed (TODO)
    callStack: string[];        // Stack des appels (utile pour debugging)
}


export async function execVm(
    blockchain: Blockchain,
    caller: AccountAddress,
    contractAddress: AccountAddress,
    className: string,
    methodName: string,
    args: any[],
    memoryState: MemoryState | null,
    vmMonitor?: VmMonitor,
): Promise<{ vmResult: any | null, vmMonitor: VmMonitor, vmError: any | null }> {

    if (! vmMonitor) {
        vmMonitor = { totalCalls: 0, gasUsed: 0n, callStack: []};
    }

    console.log(`[execVm] txSigner = ${caller} | script: ${contractAddress} | class = ${className} | method = ${methodName}`)


    // 🔄 Mise à jour du moniteur
    vmMonitor.totalCalls++;
    vmMonitor.gasUsed++;  // Pour l'instant, 1 appel = 1 gas


    // Vérifier si le gas est suffisant (future implémentation)
    // if (vmMonitor.gasUsed > gasLimit) throw new Error(`[execVm] Gas limit exceeded`);


    // Vérifications standard
    asserts(contractAddress && contractAddress.startsWith('0x'), "[execVm] missing script address");

    const contractAccount = blockchain.getAccount(contractAddress, memoryState);
    asserts(contractAccount.abi, `[execVm] L'account ${contractAddress} n'est pas un smart contract !`);
    asserts(contractAccount.code, `[execVm] missing script code at address ${contractAddress}`);


    const abiClass: CodeAbiClass | null = contractAccount.abi?.find(classAbi => classAbi.class === className) ?? null;
    asserts(abiClass, `[execVm] missing abi contract class`);

    const abiClassMethod: CodeAbiClassMethod = abiClass.methods[methodName];
    asserts(abiClass, `[execVm] missing abi contract method`);

    const inputTypes = (abiClassMethod.inputs ?? []).map(name => "string").join(",");
    const signatureString = `${methodName}(${inputTypes})`;


    // Vérifier si l’ABI contient la classe demandée
    asserts(abiClassMethod, `[execVm] La méthode "${methodName}" n'existe pas dans "${className}" !`);

    // Vérifier que les arguments correspondent (optionnel)
    //if (abiClassMethod.inputs) {
    //    //asserts(method.inputs.length === scriptArgs.length, `[execVm] La méthode "${scriptMethod}" attend ${method.inputs.length} arguments, mais ${scriptArgs.length} ont été fournis !`);
    //}


    const contractCode: string = contractAccount.code;
    // Note: voir si on pourrait pas accepter un contractCode écrit en Typescript et en le transcodant via new Function(contractCode).toString()


    // Compile le code du contrat
    const compiledCode: Script = new Script(contractCode);
    //const contructorArgs = contractAccount.contructorArgs;
    const compiledScript: Script = new Script(`(new ${className}).${methodName}(${stringifyParams(args)})`);

    const sandbox = createSandbox(blockchain, caller, contractAddress, vmMonitor, memoryState);
    const vmContext = createContext(sandbox)
    //console.log('vmContext:', vmContext)


    // Charge le code source du contrat
    compiledCode.runInContext(vmContext, { breakOnSigint: true, timeout: 10 });


    // Ajout à la stack d'exécution
    vmMonitor.callStack.push(signatureString);


    // ⚡ Exécute la méthode demandée
    const scriptTimeout = 100; // TODO: à implémenter + l'ajouter à vmMonitor afin de gérer le temps d'execution d'un (sous) call et aussi le temps total d'execution (tous calls et sous-calls additionnés)

    try {
        const vmResult = await compiledScript.runInContext(vmContext, { breakOnSigint: true, timeout: scriptTimeout });
        //console.log(`[execVm] ✅ Résultat de ${signatureString}:`, vmResult);

        return { vmResult, vmMonitor, vmError: null };

    } catch (vmError: any) {
        return { vmResult: null, vmMonitor, vmError };
    }
}



/** Créé un environnement sandbox pour la VM */
export function createSandbox(blockchain: Blockchain, caller: AccountAddress, contractAddress: AccountAddress, vmMonitor: VmMonitor, memoryState: MemoryState | null): { [methodOrVariable: string]: any } {

    // Prépare le contexte d'exécution
    const sandboxUtils: { [method: string]: Function } = {
        log: console.log,

        transfer: async (to: AccountAddress, amount: bigint): Promise<void> => {
            console.log(`[transfer] => from = ${contractAddress} | to = ${to} | amount = ${amount}`)
            blockchain.transfer(contractAddress, to, amount, memoryState);
        },

        call: async (callContractAddress: AccountAddress, callClassName: string, callMethodName: string, callArgs: any[]): Promise<void> => {
            console.log(`[call] => caller = ${contractAddress} | script = ${callContractAddress} | class = ${callClassName} | method = ${callMethodName}`)
            await execVm(blockchain, contractAddress, callContractAddress, callClassName, callMethodName, callArgs, memoryState, vmMonitor);
        },

        balance: (address: AccountAddress) => {
            return blockchain.getAccount(address, memoryState)?.balance ?? 0n;
        },

        memory: (initialValues: ContractMemory): ContractMemory => {
            const account = blockchain.getAccount(contractAddress, memoryState);
            const lastValues = account.memory;

            const memory: ContractMemory = {
                ...initialValues,
                ...lastValues,
            };

            account.memory = memory;

            return memory;
        },

        asserts,

        revert: (message?: string) => { throw new Error(message ?? "Reverted") },

        hash: computeStrHash,

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

    const sandboxData: { [method: string]: any } = {
        address: contractAddress, // TODO: à renommer en "self"
        caller,
        decimals,
        fullcoin,
    }

    const sandbox: { [methodOrVariable: string]: any } = {
        ...sandboxUtils,
        ...sandboxData,

        // Note: penser à mettre à jour `createSandboxMock()` ET `contract.dummy.ts` en cas de modification de sandboxUtils ou sandboxData
    };

    Object.defineProperty(sandbox, 'constructor', { value: undefined });
    Object.defineProperty(sandbox, 'this', { value: undefined });

    return sandbox;
}



/** Ce mock sert uniquement lors du déploiement du contrat, pour générer l'Abi */
export function createSandboxMock(classNames: string[]): { [methodOrVariable: string]: any } {
    const sandboxUtils: { [method: string]: Function } = {
        log: console.log,

        transfer: async (to: any, amount: bigint): Promise<void> => {},

        call: async (callContractAddress: any, callClassName: string, callMethodName: string, callArgs: any[]): Promise<void> => {},

        balance: (address: any) => {},

        memory: (initialValues: any) => {},

        asserts: (condition: any) => {},

        revert: (message?: string) => {},

        hash: (dataToHash: string) => {},

        lower: (str: string) => {},

        upper: (str: string) => {},

        getBlock: (blockHeight: number) => {},

        getBlockHash: (blockHeight: number) => {},

        getBlockHeight: (blockHash: any) => {},

        getBlockByHash: (blockHash: any) => {},
    }

    const sandboxData: { [method: string]: any } = {
        address: "",
        caller: "",
        decimals: 0,
        fullcoin: 0n,
        classNames,
    }

    const sandbox: { [methodOrVariable: string]: any } = {
        ...sandboxUtils,
        ...sandboxData,
    };

    Object.defineProperty(sandbox, 'constructor', { value: undefined });
    Object.defineProperty(sandbox, 'this', { value: undefined });

    return sandbox;
}


