// 0xcontract_test_2.js



class ContractTest2 {

    test_vm_2_a() {
        log('DEBUG test_vm_2_a: START')

        // ContractTest2 envoie 2 DEV à 0xhuman_4
        transfer("0xhuman_4", 4n * fullcoin);

        log('DEBUG test_vm_2_a: END')
    }


    test_vm_2_b() {
        log('DEBUG test_vm_2_b: START')

        // ContractTest2 envoie 2 DEV à 0xhuman_4
        transfer("0xhuman_4", 40n * fullcoin);

        log('DEBUG test_vm_2_b: END')
    }

}

