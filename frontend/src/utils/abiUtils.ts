// abiUtils.ts

import * as acorn from "acorn";
import * as walk from "acorn-walk";

import { CodeAbi, EthersAbi } from "@backend/types/account.types";



/** Convertit un ABI personnalisé en un format compatible avec Ethers.js */
export function convertCustomAbiToEthersFormat(customAbi: CodeAbi): EthersAbi {
    const ethersAbi: EthersAbi = [];

    for (const abiClass of customAbi) {

        // 1. Methodes
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
                stateMutability: (methodData.write || methodData.payable)
                    ? (methodData.payable ? 'payable' : 'non-payable')
                    : 'view',
            });
        }

        // 2. Attributs
        for (const [attrName, attrData] of Object.entries(abiClass.attributes)) {
            const outputType = 'string'; // mapJsTypeToSolidity(attrData.type);

            ethersAbi.push({
                type: "function",
                name: attrName,
                inputs: [], // Les variables publiques n'ont pas d'arguments
                outputs: [{ name: "", type: outputType }],
                stateMutability: "view",
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
            if (methodData.write || methodData.payable) {
                executes.push(methodName);

            } else {
                calls.push(methodName);
            }
        });
    });

    return { calls, executes };
}


export function extractClassNamesWithAcorn(contractCode: string): string[] {
    const ast = acorn.parse(contractCode, { ecmaVersion: "latest" });
    const classNames: string[] = [];

    (function traverse(node: any) {
        if (node.type === "ClassDeclaration" && node.id) {
            classNames.push(node.id.name);
        }

        for (const key in node) {
            if (typeof node[key] === "object" && node[key] !== null) {
                traverse(node[key]);
            }
        }
    })(ast);

    return classNames;
}



export function extractConstructorParamsWithAcorn(contractCode: string, className: string): string[] {
    try {
        const ast = acorn.parse(contractCode, { ecmaVersion: "latest" });

        let constructorParams: string[] = [];

        walk.simple(ast, {
            ClassDeclaration(node: any) {
                if (node.id.name === className) {
                    for (const method of node.body.body) {
                        if (method.kind === "constructor") {
                            constructorParams = method.value.params.map((param: any) =>
                                param.name ? param.name : (param.left?.name || "param")
                            );
                            break;
                        }
                    }
                }
            },
        });

        return constructorParams;

    } catch (error) {
        console.error("Erreur lors de l'analyse du constructeur :", error);
        return [];
    }
}

