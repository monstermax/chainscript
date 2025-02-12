// test_abi.ts

import fs from 'fs';

import { generateContractAbi } from "./abi";


/* ######################################################### */



async function main() {
    const codeFilepath = `${__dirname}/example/scripts/ContractToken1.js`;
    const code = fs.readFileSync(codeFilepath).toString();

    if (true) {
        const abi = generateContractAbi(code);
        console.log('abi:', abi[0]);
    }

}


main();
