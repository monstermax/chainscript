// 0xcontract_test_1.js



class ContractTest1 {

    async test_vm_1() {
        log('DEBUG test_vm_1: START')

        // ContractTest1 envoie 2 DEV à 0xhuman_2
        await transfer("0xhuman_2", 2n * fullcoin);

        // ContractTest1 envoie 300 DEV à 0xhuman_3
        //await transfer("0xhuman_3", 300n * fullcoin);

        // ContractTest1 envoie 5 DEV à 0xcontract_test_2
        await transfer("0xcontract_test_2", 5n * fullcoin);

        // ContractTest1 appelle 0xcontract_test_2 => ContractTest2.test_vm_2_b()
        //await call('0xcontract_test_2', 'ContractTest2', 'test_vm_2_b', []);

        // ContractTest1 envoie 100 DEV à 0xcontract_token_1
        //await transfer("0xcontract_token_1", 100n * fullcoin);

        log('DEBUG test_vm_1: END')
    }


}
