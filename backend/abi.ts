// abi.ts

import fs from 'fs';
import { parse } from 'acorn';
import { keccak256, toUtf8Bytes } from "ethers";
import { createContext, Script } from "vm";

import { createDeploymentSandbox } from './vm';
import { hasOpt, stringifyParams } from './utils';

import type { AbiSearchResult, AbiSearchResultAttribute, AbiSearchResultMethod, AccountAddress, CodeAbi, CodeAbiClass, CodeAbiClassAttribute, CodeAbiClassAttributes, CodeAbiClassMethod, CodeAbiClassMethods, ContractMemory } from "./types/account.types";


/* ######################################################### */


/** Cherche la classe & method correspondant à la signature (encodée) fournie */
export function findMethodAbi(abi: CodeAbi, methodSignature: string): AbiSearchResult | null {
    for (const abiClass of abi) {
        for (const [methodName, abiClassMethod] of Object.entries(abiClass.methods)) {

            // On force tous les types (inputs) en string (car JS n'est pas typé)
            const inputTypes = (abiClassMethod.inputs ?? []).map(name => "string").join(",");
            const signatureString = `${methodName}(${inputTypes})`; // 🔄 Supprime le `className.`

            // Générer la signature Ethereum standard
            const hash = keccak256(toUtf8Bytes(signatureString)).slice(0, 10);

            if (hash === methodSignature.slice(0, 10)) {
                console.log(`[findMethodAbi] ✅ Méthode trouvée: ${abiClass.class}.${methodName}`);

                const methodAbi: AbiSearchResultMethod = {
                    type: 'method',
                    className: abiClass.class,
                    methodName,
                    class: abiClass,
                    method: abiClass.methods[methodName],
                };

                return methodAbi;
            }
        }

        for (const [attributeName, attributeData] of Object.entries(abiClass.attributes)) {
            const attributeType = attributeData.type;

            const attributeSignature = `${attributeName}()`;
            const attributeHash = keccak256(toUtf8Bytes(attributeSignature)).slice(0, 10);

            if (attributeHash === methodSignature.slice(0, 10)) {
                console.log(`[findMethodAbi] ✅ Attribut trouvé: ${abiClass.class}.${attributeName} (Type: ${attributeType})`);

                const attributeAbi: AbiSearchResultAttribute = {
                    type: 'attribute',
                    className: abiClass.class,
                    methodName: attributeName,
                    class: abiClass,
                    attribute: abiClass.attributes[attributeName],
                };

                return attributeAbi;
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
export function instanciateContractAndGenerateAbi(caller: AccountAddress, contractCode: string, className: string, constructorArgs: string[], contractAddress?: AccountAddress): { abi: CodeAbi, contractMemory: object } {
    // Note: voir si on pourrait pas accepter un contractCode écrit en Typescript et en le transcodant via new Function(contractCode).toString()

    // Extrait les classes déclarées dans le code source
    //const classNames = extractClassNamesWithAcorn(contractCode);
    const classNames = className ? [className] : extractClassNamesWithAcorn(contractCode);


    // 0. Créé un contexte d'exécution sandbox
    const sandbox = createDeploymentSandbox(caller, contractAddress);
    const vmContext = createContext(sandbox)


    // 1. ABI Analyzer

    const getClassPropertiesString = ""; //getClassProperties.toString(); // Traduit le code (Typescript) de la fonction "getClassProperties" en string (transcodé en JS).
    const getFunctionParamsString = ""; //getFunctionParams.toString(); // Traduit le code (Typescript) de la fonction "getFunctionParams" en string (transcodé en JS).
    const buildAbiString = ""; //buildAbi.toString(); // Traduit le code (Typescript) de la fonction "buildAbi" en string.
    //const classNamesString = '[' + classNames.map(className => `'${className}'`).join(', ') + ']';

    let abiAnalyzerCode = `
// Code du contrat
${contractCode}

// Dependances de buildAbi
${getClassPropertiesString}
${getFunctionParamsString}
${buildAbiString}

// Construit et retourne l'ABI
buildAbi(${className}, [${stringifyParams(constructorArgs)}]);
    `;

    let abiAnalyzerTimeout: number | undefined = 10;

    if (hasOpt('--debug-vm')) {
        const debugFilepath = `/tmp/debug_deploy_contract_${contractAddress}.abi-analyzer.js`;

        abiAnalyzerCode = `
${hasOpt('--debug-contract') ? "debugger;" : ""}

${abiAnalyzerCode}

//# sourceURL=file://${debugFilepath}
`;

        fs.writeFileSync(debugFilepath, abiAnalyzerCode);
        abiAnalyzerTimeout = undefined;
    }

    if (hasOpt('--debug-vm')) {
        abiAnalyzerTimeout = undefined;
    }


    // Instancie le script pour la VM
    const abiAnalyzerScript: Script = new Script(abiAnalyzerCode);

    // Execute l'analyseur de code pour extraire l'ABI
    const abiAnalyzerResult: CodeAbi = abiAnalyzerScript.runInContext(vmContext, { breakOnSigint: true, timeout: abiAnalyzerTimeout });
    const abi: CodeAbi = [ ...abiAnalyzerResult ];



    // 2. Class Instanciation

    let newInstanceCode = getContractNewInstanceCode(className, constructorArgs);

    let newInstanceTimeout: number | undefined = 10;

    if (hasOpt('--debug-vm')) {
        const debugFilepath = `/tmp/debug_deploy_contract_${contractAddress}.instantiate.js`;

        newInstanceCode = `
${hasOpt('--debug-contract') ? "debugger;" : ""}

${newInstanceCode}

//# sourceURL=file://${debugFilepath}
`;

        fs.writeFileSync(debugFilepath, newInstanceCode);
        newInstanceTimeout = undefined;
    }



    // Instancie la classe (initialize le constructor)
    console.log('newInstanceCode:', newInstanceCode)
    const newInstanceScript: Script = new Script(newInstanceCode);
    const newInstanceResult: object = newInstanceScript.runInContext(vmContext, { breakOnSigint: true, timeout: newInstanceTimeout });
    console.log('newInstanceResult:', newInstanceResult)

    const contractMemory: ContractMemory = { ...newInstanceResult };


    return { abi, contractMemory };
}



function getContractNewInstanceCode(className: string, methodArgs: string[]) {
    const executeCode: string = `new ${className}(${stringifyParams(methodArgs)});`;
    return executeCode;
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

    // Note: voir si possible de parser avec Acorn (voir extractConstructorParamsWithAcorn)

    // Trouver où commence le corps de la fonction `{`
    const bodyIndex = functionString.indexOf("{");
    if (bodyIndex === -1) return { params: [], isWrite: false }; // Impossible de récupérer des params

    // Extraire uniquement la partie avant `{`
    const headerString = functionString.substring(0, bodyIndex);

    // Trouver tous les commentaires `/* ... */` AVANT le `{`
    const commentsMatch = [...headerString.matchAll(/\/\*([\s\S]*?)\*\//g)];
    const comments = commentsMatch.map(match => match[1].trim()).join(" "); // Concaténer tous les commentaires

    // Extraire les paramètres en enlevant les valeurs par défaut (`=` et après)
    const match = headerString.match(/\(([^)]*)\)/);
    const params = match
        ? match[1].split(',')
            .map(param => param.split('=')[0].trim())  // Supprime la valeur par défaut
            .filter(param => param.length > 0)
        : [];

    // Vérifier si le commentaire contient " write " (avec espaces pour éviter des faux positifs)
    const isWrite = ` ${comments} `.includes(" write ");

    return { params, isWrite };
}


/** Construit l'Abi de toutes les classes demandées */
export function buildAbi(classObj: new (...args: any[]) => any, constructorArgs: string[]): CodeAbi {
    const abi: CodeAbi = [];

    //for (const className of classNames) {
        const className = classObj.name;
        //const classInstance = eval("new " + className + `(${stringifyParams(constructorArgs)})`); // Instancier la classe (doit être exécuté DANS la VM !)
        const classInstance = new classObj(...constructorArgs); // Instancier la classe (doit être exécuté DANS la VM !)

        const { methods, attributes } = getClassProperties(classInstance);

        abi.push({
            class: className,
            methods,
            attributes,
        });
    //}

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