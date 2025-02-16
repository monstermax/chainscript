// miner.ts

import { blockDelayMax, blockDelayMin, blockMinTransactions } from '../config';
import { Blockchain } from '../blockchain/blockchain';
import { asserts, now } from '../helpers/utils';

import type { AccountAddress } from '../types/account.types';


/* ######################################################### */


export class BlocksMiner {
    private blockchain: Blockchain;
    private minerAddress: AccountAddress;


    constructor(blockchain: Blockchain, minerAddress: AccountAddress) {
        this.blockchain = blockchain;
        this.minerAddress = minerAddress;

        this.start();
    }


    /** Démarre la loop où on essayera toutes les N secondes de miner un nouveau block */
    start() {
        const delay = 10_000;
        const miner = this;

        function _loop() {
            setTimeout(() => [miner.tryToMine(), _loop()], delay);
        }

        _loop();
    }


    /** Essaye de miner un block */
    async tryToMine() {
        if (this.blockchain.p2p?.isSyncing) return;

        console.log(`[${now()}][Miner.tryToMine]`);

        const blockHeight = this.blockchain.blockHeight;
        const lastBlock = this.blockchain.getBlock(blockHeight);
        asserts(lastBlock, `[Miner.tryToMine] lastBlock not found`);
        asserts(lastBlock.timestamp, `[Miner.tryToMine] lastBlock has no timestamp`);

        const lastBlockAge = Date.now() - lastBlock.timestamp;
        asserts(lastBlockAge > 0, `lastBlock is in the future`);

        const mempoolSize = this.blockchain.mempool.getPendingTransactions().length;

        if (lastBlockAge < blockDelayMin) return;

        if (mempoolSize >= blockMinTransactions || lastBlockAge > blockDelayMax || blockHeight === 0) {
            await this.blockchain.createNewBlock(this.minerAddress);
        }

    }

}

