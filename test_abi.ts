// test_abi.ts

import { AbiCoder, keccak256, toUtf8Bytes } from "ethers";
import { decodeCallData, findMethodAbi } from "./rpc";

import type { CodeAbi } from "./types/account.types";



const abi: CodeAbi = [
    {
        class: "MyContract",
        methods: {
            transfer: {
                inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
                output: [],
                public: true,
                payable: false,
            }
        }
    }
];



/** 🔍 Encode les paramètres pour un appel `eth_call` */
function generateTestData(methodSignature: string, args: any[]): string {
    const coder = new AbiCoder();

    // Calculer le hash de la signature (4 premiers bytes)
    const hash = keccak256(toUtf8Bytes(methodSignature)).slice(0, 10).toString();

    // Encoder les paramètres avec AbiCoder
    const encodedParams = coder.encode(
        ["address", "uint256"], // Les types des paramètres
        args                    // Les valeurs des paramètres
    );

    return hash + encodedParams.slice(2); // Concaténer les 4 bytes avec les params (signature et params encodés)
}



function main() {
    if (process.argv.includes('--encode')) {
        encode();
    }

    if (process.argv.includes('--decode')) {
        decode();
    }

}


/** 🔄 Encodage d'un test de transaction */
function encode() {
    const method = "transfer(address,uint256)";
    const args = ["0x123456789abcdef123456789abcdef123456789a", 10];

    const data = generateTestData(method, args);
    console.log("🔹 Test Data:", data); // Attendu: 0xa9059cbb...
}


/** 🔄 Décodage d'une transaction */
function decode() {
    const data = "0xa9059cbb000000000000000000000000123456789abcdef123456789abcdef123456789a000000000000000000000000000000000000000000000000000000000000000a";
    const methodSignature = data.slice(0, 10);

    console.log("🔹 Recherche de la méthode pour signature:", methodSignature);

    const methodAbi = findMethodAbi(abi, methodSignature);
    if (methodAbi) {
        console.log("✅ Méthode trouvée:", methodAbi.name);
        const args = decodeCallData(data, methodAbi);
        console.log("🔍 Arguments décodés:", args);
    } else {
        console.error("❌ Méthode inconnue pour la signature:", methodSignature);
    }
}



main();

