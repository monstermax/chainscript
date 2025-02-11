// vm.ts

import { Context, createContext, Script } from "vm"; // https://nodejs.org/api/vm.html

import { asserts, stringifyParams } from "./utils";
import { decimals, fullcoin } from './config';
import { Blockchain } from './blockchain';

import type { AccountAddress, ContractMemory } from "./types/account.types";
import { Block } from "./block";
import { BlockData, BlockHash } from "./types/block.types";



/* ######################################################### */


export async function execVm(blockchain: Blockchain, executorAddress: AccountAddress, scriptAddress: AccountAddress, scriptClass: string, scriptMethod: string, scriptArgs: any[], vmMonitor: { counter: number }) {
    console.log(`[execVm] txSigner = ${executorAddress} | script: ${scriptAddress} | class = ${scriptClass} | method = ${scriptMethod}`)
    vmMonitor.counter++;

    asserts(scriptAddress && scriptAddress.startsWith('0x'), "[execVm] missing script address");

    const scriptAccount = blockchain.getAccount(scriptAddress);
    asserts(scriptAccount.abi, `[execVm] L'account ${scriptAddress} n'est pas un smart contract !`);

    // Vérifier si l’ABI contient la classe demandée
    const abiClass = scriptAccount.abi.find(c => c.class === scriptClass);
    asserts(abiClass, `[execVm] Le contrat ${scriptAddress} ne contient pas la classe "${scriptClass}" !`);

    // Vérifier si l’ABI contient la méthode demandée
    const method = abiClass.methods[scriptMethod];
    asserts(method, `[execVm] La méthode "${scriptMethod}" n'existe pas dans "${scriptClass}" !`);

    // Vérifier que les arguments correspondent (optionnel)
    if (method.inputs) {
        //asserts(method.inputs.length === scriptArgs.length, `[execVm] La méthode "${scriptMethod}" attend ${method.inputs.length} arguments, mais ${scriptArgs.length} ont été fournis !`);
    }

    asserts(scriptAccount.code, `[execVm] missing script code at adress ${scriptAddress}`);

    // Compile code + script
    const compiledCode = new Script(scriptAccount.code);
    const compiledScript = new Script(`(new ${scriptClass}).${scriptMethod}(${stringifyParams(scriptArgs)})`);


    // Prepare VM context
    const sandboxUtils: { [method: string]: Function } = {
        log: console.log,
        transfer: async (to: AccountAddress, amount: bigint): Promise<void> => {
            console.log(`[transfer] => from = ${scriptAddress} | to = ${to} | amount = ${amount}`)
            blockchain.transfer(scriptAddress, to, amount);
        },
        call: async (calledScriptAddress: AccountAddress, calledScriptClass: string, calledScriptMethod: string, args: any[]): Promise<void> => {
            console.log(`[call] => caller = ${scriptAddress} | script = ${calledScriptAddress} | class = ${calledScriptClass} | method = ${calledScriptMethod}`)
            await execVm(blockchain, scriptAddress, calledScriptAddress, calledScriptClass, calledScriptMethod, args, vmMonitor);
        },
        balance: (address: AccountAddress) => blockchain.getAccount(address)?.balance ?? 0n,
        memory: (initialValues: ContractMemory): ContractMemory => {
            const account = blockchain.getAccount(scriptAddress);
            const lastValues = account.memory;

            const memory: ContractMemory = {
                ...initialValues,
                ...lastValues,
            };

            account.memory = memory;

            return memory;
        },
        asserts,
        getBlock: (blockHeight: number): BlockData | null => blockchain.getBlock(blockHeight)?.toData() ?? null,
        getBlockHash: (blockHeight: number): BlockHash | null => blockchain.getBlock(blockHeight)?.hash ?? null,
        getBlockHeight: (blockHash: BlockHash): number | null => blockchain.getBlockHeight(blockHash) ?? null,
        getBlockByHash: (blockHash: BlockHash): BlockData | null => blockchain.getBlockByHash(blockHash)?.toData() ?? null,
    }

    const sandboxData: { [method: string]: any } = {
        address: scriptAddress,
        caller: executorAddress,
        decimals,
        fullcoin,
    }

    const sandbox = {
        ...sandboxUtils,
        ...sandboxData,
    };

    Object.defineProperty(sandbox, 'constructor', { value: undefined });
    Object.defineProperty(sandbox, 'this', { value: undefined });

    const vmContext = createContext(sandbox)
    //console.log('vmContext:', vmContext)


    // Load compiled source code
    compiledCode.runInContext(vmContext, { breakOnSigint: true, timeout: 10 });


    // Execute script
    await compiledScript.runInContext(vmContext, { breakOnSigint: true, timeout: 100 });
}

