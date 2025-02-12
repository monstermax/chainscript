// vm.ts

import { createContext, Script } from "vm"; // https://nodejs.org/api/vm.html

import { asserts, stringifyParams } from "./utils";
import { decimals, fullcoin } from './config';
import { Blockchain } from './blockchain';
import { MemoryState } from "./stateManager";
import { findMethodAbi } from "./abi";

import type { AccountAddress, ContractMemory } from "./types/account.types";
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
): Promise<{ vmResult: any, vmMonitor: VmMonitor }> {

    if (! vmMonitor) {
        vmMonitor = { totalCalls: 0, gasUsed: 0n, callStack: []};
    }

    console.log(`[execVm] txSigner = ${caller} | script: ${contractAddress} | class = ${className} | method = ${methodName}`)


    // 🔄 Mise à jour du moniteur
    vmMonitor.totalCalls++;
    vmMonitor.gasUsed++;  // Pour l'instant, 1 appel = 1 gas


    // Ajout à la stack d'exécution
    const callSignature = `${contractAddress}.${className}.${methodName}(${args.map(a => JSON.stringify(a)).join(', ')})`;
    vmMonitor.callStack.push(callSignature);


    // Vérifier si le gas est suffisant (future implémentation)
    // if (vmMonitor.gasUsed > gasLimit) throw new Error(`[execVm] Gas limit exceeded`);


    // Vérifications standard
    asserts(contractAddress && contractAddress.startsWith('0x'), "[execVm] missing script address");

    const contractAccount = blockchain.getAccount(contractAddress, memoryState);
    asserts(contractAccount.abi, `[execVm] L'account ${contractAddress} n'est pas un smart contract !`);
    asserts(contractAccount.code, `[execVm] missing script code at address ${contractAddress}`);


    // Vérifier si l’ABI contient la classe demandée
    const abiClassMethod = findMethodAbi(contractAccount.abi, callSignature);
    asserts(abiClassMethod, `[execVm] La méthode "${methodName}" n'existe pas dans "${className}" !`);


    // Vérifier que les arguments correspondent (optionnel)
    //if (abiClassMethod.inputs) {
    //    //asserts(method.inputs.length === scriptArgs.length, `[execVm] La méthode "${scriptMethod}" attend ${method.inputs.length} arguments, mais ${scriptArgs.length} ont été fournis !`);
    //}



    // Compile le code du contrat
    const compiledCode = new Script(contractAccount.code);
    //const contructorArgs = contractAccount.contructorArgs;
    const compiledScript = new Script(`(new ${className}).${methodName}(${stringifyParams(args)})`);


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
        address: contractAddress,
        caller: caller,
        decimals,
        fullcoin,
    }

    const sandbox: { [methodOrVariable: string]: any } = {
        ...sandboxUtils,
        ...sandboxData,
    };

    Object.defineProperty(sandbox, 'constructor', { value: undefined });
    Object.defineProperty(sandbox, 'this', { value: undefined });

    const vmContext = createContext(sandbox)
    //console.log('vmContext:', vmContext)


    // Charge le code source du contrat
    compiledCode.runInContext(vmContext, { breakOnSigint: true, timeout: 10 });


    // ⚡ Exécute la méthode demandée
    const scriptTimeout = 100; // TODO: à implémenter + l'ajouter à vmMonitor afin de gérer le temps d'execution d'un (sous) call et aussi le temps total d'execution (tous calls et sous-calls additionnés)
    const vmResult = await compiledScript.runInContext(vmContext, { breakOnSigint: true, timeout: scriptTimeout });

    console.log(`[execVm] ✅ Résultat de ${callSignature}:`, vmResult);

    return { vmResult, vmMonitor };
}




