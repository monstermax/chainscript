
import { Blockchain } from './blockchain';

import type { AccountAddress } from './types/account.types';


/* ######################################################### */


export class BlocksMiner {
    private blockchain: Blockchain;
    private minerAddress: AccountAddress;


    constructor(blockchain: Blockchain, minerAddress: AccountAddress) {
        this.blockchain = blockchain;
        this.minerAddress = minerAddress;
    }


    start() {
        const delay = 10_000;
        const miner = this;

        function _loop() {
            setTimeout(() => [miner.tryToMine(), _loop()], delay);
        }

        _loop();
    }


    async tryToMine() {
        console.log(`[BlocksMiner.tryToMine]`);

        const mempoolSize = this.blockchain.mempool.getPendingTransactions().length;

        if (mempoolSize > 0) {
            await this.blockchain.createBlock(this.minerAddress);
        }

    }

}

