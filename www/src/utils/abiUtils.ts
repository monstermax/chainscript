// abiUtils.ts

import { CodeAbi } from "@backend/types/account.types";



/** Convertit un ABI personnalisé en un format compatible avec Ethers.js */
export function convertCustomAbiToEthersFormat(customAbi: CodeAbi) {
    const ethersAbi = [];

    for (const abiClass of customAbi) {
        for (const [methodName, methodData] of Object.entries(abiClass.methods)) {
            const inputs = (methodData.inputs ?? []).map(input => ({
                name: input,
                type: "string", // input.includes("address") ? "address" : "uint256",
            }));

            const outputs = [
                {
                    name: "",
                    type: "string",
                },
            ];

            ethersAbi.push({
                type: "function",
                name: methodName,
                inputs,
                outputs,
                stateMutability: methodData.write ? 'non-payable' : 'view',
            });
        }
    }

    return ethersAbi;
}



export function extractAbiMethods(abi: CodeAbi): { calls: string[], executes: string[] } {
    const calls: string[] = [];
    const executes: string[] = [];

    abi.forEach(contract => {
        Object.entries(contract.methods).forEach(([methodName, methodData]) => {
            if (methodData.write) {
                executes.push(methodName);
            } else {
                calls.push(methodName);
            }
        });
    });

    return { calls, executes };
}

