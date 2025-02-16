
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
                stateMutability: methodData.write ? 'non-payable' : 'view',
            });
        }

        // 2. Attrributs
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


