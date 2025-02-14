// abi.ts

import { parse } from 'acorn';
import { keccak256, toUtf8Bytes } from "ethers";
import { createContext, Script } from "vm";

import { createSandboxMock } from './vm';

import type { AbiClassMethod, CodeAbi, CodeAbiClassAttributes, CodeAbiClassMethods } from "./types/account.types";


/* ######################################################### */


/** Cherche la classe & method correspondant à la signature (encodée) fournie */
export function findMethodAbi(abi: CodeAbi, methodSignature: string): AbiClassMethod | null {
    for (const abiClass of abi) {
        for (const [methodName, abiClassMethod] of Object.entries(abiClass.methods)) {

            // On force tous les types (inputs) en string (car JS n'est pas typé)
            const inputTypes = (abiClassMethod.inputs ?? []).map(name => "string").join(",");
            const signatureString = `${methodName}(${inputTypes})`; // 🔄 Supprime le `className.`

            // 📌 Générer la signature Ethereum standard
            const hash = keccak256(toUtf8Bytes(signatureString)).slice(0, 10);

            if (hash === methodSignature.slice(0, 10)) {
                console.log(`[findMethodAbi] ✅ Méthode trouvée: ${abiClass.class}.${methodName}`);

                return { className: abiClass.class, methodName, class: abiClass, method: abiClass.methods[methodName] };
            }
        }
    }

    console.warn(`[findMethodAbi] ❌ Méthode inconnue pour la signature: ${methodSignature}`);
    return null;
}



/*
// Encode une transaction en `eth_call` compatible avec Metamask
export function encodeCallData(className: string, methodName: string, args: any[], abiClassMethod: CodeAbiClassMethod): string {
    const coder = new AbiCoder();

    // Encoder les paramètres en ABI
    const encodedParams = coder.encode(abiClassMethod.inputs ?? [], args);

    // ✅ Format de signature : `className.methodName(types)`
    //const inputTypes = (methodAbi.inputs ?? []).join(",");
    const inputTypes = (abiClassMethod.inputs ?? []).map(name => "string").join(",");
    const signatureString = `${className}.${methodName}(${inputTypes})`;

    const signatureHash = keccak256(toUtf8Bytes(signatureString)).slice(0, 10); // 4 bytes de signature

    return signatureHash + encodedParams.slice(2);
}
*/


/** Détecte dynamiquement les propriétés et méthodes d'un contrat */
export function generateContractAbi(contractCode: string): CodeAbi {
    const abi: CodeAbi = [];

    // 📌 Extrait les classes déclarées dans le code source
    const classNames = extractClassNamesWithAcorn(contractCode);


    // Prépare le contexte d'exécution
    const sandbox = createSandboxMock(classNames);

    const vmContext = createContext(sandbox)


    // 📌 Exécute le code dans un contexte isolé pour identifier les classes
    const compiledSourceCode: Script = new Script(contractCode);

    const getClassPropertiesString = getClassProperties.toString(); // Traduit le code (Typescript) de la fonction "getClassProperties" en string (transcodé en JS).
    const getFunctionParamsString = getFunctionParams.toString(); // Traduit le code (Typescript) de la fonction "getFunctionParams" en string (transcodé en JS).
    const buildAbiString = buildAbi.toString(); // Traduit le code (Typescript) de la fonction "buildAbi" en string.
    const classNamesString = '[' + classNames.map(className => `'${className}'`).join(', ') + ']';

    // Note: voir si on pourrait pas accepter un contractCode écrit en Typescript et en le transcodant via new Function(contractCode).toString()

    const searchCode = `
        ${getClassPropertiesString}
        ${getFunctionParamsString}
        ${buildAbiString}
        buildAbi(${classNamesString});
    `;

    const compiledSearchCode: Script = new Script(searchCode);

    // Charge le code source du contrat
    compiledSourceCode.runInContext(vmContext, { breakOnSigint: true, timeout: 10 });

    // Execute l'analyseur de code
    const result = compiledSearchCode.runInContext(vmContext, { breakOnSigint: true, timeout: 10 });

    abi.push(...result);

    return abi;
}


/** Récupère les méthodes publiques d’une classe */
export function getClassProperties(instance: any): { methods: CodeAbiClassMethods, attributes: CodeAbiClassAttributes } {
    const methods: CodeAbiClassMethods = {};

    // Récupère les attributs d'instance
    const attributesNames: string[] = Object.keys(instance);

    // Construire l'objet des attributs
    const attributes: CodeAbiClassAttributes = Object.fromEntries(
        attributesNames.map(name => [name, { type: typeof instance[name] }])
    );


    // Récupère les méthodes publiques
    const methodNames: string[] = Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
        .filter(name => name !== "constructor" && typeof instance[name] === "function");

    // Construire l'objet des méthodes
    for (const methodName of methodNames) {
        const method = instance[methodName];
        const { params, isWrite } = getFunctionParams(method);

        methods[methodName] = {
            inputs: params,
            write: isWrite,
        };
    }

    return { methods, attributes };
}


/** Récupère les noms des paramètres d’une fonction JS et détecte les annotations */
export function getFunctionParams(func: Function): { params: string[], isWrite: boolean } {
    let functionString = func.toString().replace(/\n/g, " "); // Supprime les sauts de ligne pour éviter les problèmes d'analyse

    // 🛑 Trouver où commence le corps de la fonction `{`
    const bodyIndex = functionString.indexOf("{");
    if (bodyIndex === -1) return { params: [], isWrite: false }; // Impossible de récupérer des params

    // 🎯 Extraire uniquement la partie avant `{`
    const headerString = functionString.substring(0, bodyIndex);

    // 🔍 Trouver tous les commentaires `/* ... */` AVANT le `{`
    const commentsMatch = [...headerString.matchAll(/\/\*([\s\S]*?)\*\//g)];
    const comments = commentsMatch.map(match => match[1].trim()).join(" "); // Concaténer tous les commentaires

    // 📌 Extraire les paramètres en enlevant les valeurs par défaut (`=` et après)
    const match = headerString.match(/\(([^)]*)\)/);
    const params = match
        ? match[1].split(',')
            .map(param => param.split('=')[0].trim())  // Supprime la valeur par défaut
            .filter(param => param.length > 0)
        : [];

    // 📝 Vérifier si le commentaire contient " write " (avec espaces pour éviter des faux positifs)
    const isWrite = ` ${comments} `.includes(" write ");

    return { params, isWrite };
}


/** Construit l'Abi de toutes les classes demandées */
export function buildAbi(classNames: string[]) {
    const abi: CodeAbi = [];

    for (const className of classNames) {
        const classInstance = eval("new " + className + "()"); // Instancier la classe
        const { methods, attributes } = getClassProperties(classInstance);

        abi.push({
            class: className,
            methods,
            attributes,
        });
    }

    return abi;
}


/** Trouve et extrait la liste des classes JS dans du code sous forme de string */
export function extractClassNamesWithAcorn(contractCode: string): string[] {
    const ast = parse(contractCode, { ecmaVersion: "latest" });
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