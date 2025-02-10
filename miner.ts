
import { Blockchain } from './blockchain';
import { blockDelayMax, blockDelayMin } from './config';

import type { AccountAddress } from './types/account.types';
import { asserts, now } from './utils';


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
        console.log(`[${now()}][BlocksMiner.tryToMine]`);

        const lastBlock = this.blockchain.getBlock(this.blockchain.blockHeight);
        asserts(lastBlock, `[BlocksMiner.tryToMine] lastBlock not found`);
        asserts(lastBlock.timestamp, `[BlocksMiner.tryToMine] lastBlock has no timestamp`);

        const lastBlockAge = Date.now() - lastBlock.timestamp;
        asserts(lastBlockAge > 0, `lastBlock is in the future`);

        const mempoolSize = this.blockchain.mempool.getPendingTransactions().length;

        if (lastBlockAge < blockDelayMin) return;

        if (mempoolSize > 0 || lastBlockAge > blockDelayMax) {
            await this.blockchain.createBlock(this.minerAddress);
        }

    }

}

