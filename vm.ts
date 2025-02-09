// vm.ts

import fs from 'fs';

//import ivm from 'isolated-vm'; // https://github.com/laverdet/isolated-vm
import { Context, createContext, Script } from "vm"; // https://nodejs.org/api/vm.html

import { decimals, fullcoin } from './config';
import { MemoryState } from './stateManager';
import { asserts, stringifyParams } from "./utils";

import type { AccountAddress, ContractMemory } from "./types";
import { Blockchain } from './blockchain';

/* ######################################################### */


export async function execVm(blockchain: Blockchain, executorAddress: AccountAddress, scriptAddress: AccountAddress, scriptClass: string, scriptMethod: string, scriptArgs: any[], parentContext?: Context) {
    console.log(`[execVm] txSigner = ${executorAddress} | script: ${scriptAddress} | class = ${scriptClass} | method = ${scriptMethod}`)

    asserts(scriptAddress && scriptAddress.startsWith('0x'), "[execVm] missing script address");

    //const execScriptCode = loadScriptCode(scriptAddress);

    const scriptAccount = blockchain.getAccount(scriptAddress);
    const execScriptCode = scriptAccount.code;
    const execScriptAbi = scriptAccount.abi;

    asserts(execScriptCode, `[execVm] missing script code at adress ${scriptAddress}`);

    // Compile code + script
    const compiledCode = new Script(execScriptCode);
    const compiledScript = new Script(`(new ${scriptClass}).${scriptMethod}(${stringifyParams(scriptArgs)})`);


    // Prepare VM context
    const sandboxUtils: { [method: string]: Function } = {
        log: console.log,
        transfer: async (to: AccountAddress, amount: bigint) => {
            console.log(`[transfer] => from = ${scriptAddress} | to = ${to} | amount = ${amount}`)
            blockchain.transfer(scriptAddress, to, amount);
        },
        call: async (calledScriptAddress: AccountAddress, calledScriptClass: string, calledScriptMethod: string, args: any[]) => {
            console.log(`[call] => caller = ${scriptAddress} | script = ${calledScriptAddress} | class = ${calledScriptClass} | method = ${calledScriptMethod}`)
            await execVm(blockchain, scriptAddress, calledScriptAddress, calledScriptClass, calledScriptMethod, args, vmContext);
        },
        balance: (address: AccountAddress) => blockchain.getAccount(address)?.balance ?? 0,
        memory: (initialValues: ContractMemory) => {
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
    }

    const sandboxData: { [method: string]: any } = {
        address: scriptAddress,
        caller: executorAddress,
        decimals,
        fullcoin,
    }

    const sandbox = {
        //...parentContext,
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


/*
export function loadScriptCode(scriptAddress: AccountAddress) {
    // Load source code
    const execScriptFile = `${__dirname}/vm_code/${scriptAddress}.js`;
    asserts(fs.existsSync(execScriptFile), "[loadScriptCode] script file not found");

    const execScriptCode = fs.readFileSync(execScriptFile).toString();
    return execScriptCode;
}
*/

