
import fs from 'fs';
import { buildAbi, generateContractAbi, getClassProperties, getFunctionParams } from "./abi";




async function main() {
    const codeFilepath = `${__dirname}/example/scripts/ContractToken1.js`;
    const code = fs.readFileSync(codeFilepath).toString();

    //const abi = generateContractAbi(code);
    //console.log('abi:', abi);

    const getClassPropertiesString = getClassProperties.toString();
    const getFunctionParamsString = getFunctionParams.toString();
    const buildAbiString = buildAbi.toString();

    console.log('getClassProperties:', getClassPropertiesString.toString());
    console.log('getFunctionParams:', getFunctionParamsString.toString());
    console.log('buildAbi:', buildAbiString.toString());




}


main();
