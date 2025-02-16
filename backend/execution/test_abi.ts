// test_abi.ts

import fs from 'fs';

import { instanciateContractAndGenerateAbi } from "./abi";


/* ######################################################### */



async function main() {
    const caller = "0xee5392913a7930c233Aa711263f715f616114e9B";

    const codeFilepath = `${__dirname}/../example/scripts/ContractToken2.js`;
    const code = fs.readFileSync(codeFilepath).toString();

    if (true) {
        const { abi, contractMemory: attributes } = instanciateContractAndGenerateAbi(caller, code, 'ContractToken2', ['BitScript', 'BIS']);
        //console.log('abi:', abi);
        console.log('attributes:', attributes);
    }

}


main();
