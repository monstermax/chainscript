// ContractTest1.js


class ContractTest1 {

    async test_vm_1() /* write */ {
        log('DEBUG test_vm_1: START')

        // ContractTest1 envoie 2 DEV à addressTest2
        await transfer("0x0000000000000000000000000000000000000020", 2n * chain.fullcoin);

        // ContractTest1 envoie 300 DEV à addressTest3
        //await transfer("0x0000000000000000000000000000000000000030", 300n * chain.fullcoin);

        // ContractTest1 envoie 5 DEV à 0x0000000000000000000000000000000000002000
        await transfer("0x0000000000000000000000000000000000002000", 5n * chain.fullcoin);

        // ContractTest1 appelle 0x0000000000000000000000000000000000002000 => ContractTest2.test_vm_2_b()
        //await call('0x0000000000000000000000000000000000002000', 'ContractTest2', 'test_vm_2_b', []);

        // ContractTest1 envoie 100 DEV à 0x0000000000000000000000000000000000003000
        //await transfer("0x0000000000000000000000000000000000003000", 100n * chain.fullcoin);

        log('DEBUG test_vm_1: END')
    }


}
