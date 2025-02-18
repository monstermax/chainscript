// ContractTest2.js


class ContractTest2 {

    test_vm_2_a() {
        log('DEBUG test_vm_2_a: START')

        // ContractTest2 envoie 2 DEV à addressTest4
        transfer("0x0000000000000000000000000000000000000040", 4n * chain.fullcoin);

        log('DEBUG test_vm_2_a: END')
    }


    test_vm_2_b() {
        log('DEBUG test_vm_2_b: START')

        // ContractTest2 envoie 2 DEV à addressTest4
        transfer("0x0000000000000000000000000000000000000040", 40n * chain.fullcoin);

        log('DEBUG test_vm_2_b: END')
    }

}

