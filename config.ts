// config.ts

import path from 'path';

export const STATE_DIR = path.join(__dirname, 'state');
export const BLOCKS_DIR = path.join(STATE_DIR, 'blocks');
export const ACCOUNTS_DIR = path.join(STATE_DIR, 'accounts');

export const symbol = "DEV";
export const decimals = 6;
export const fullcoin = BigInt(Math.pow(10, decimals));

export const blockReward = 50n * BigInt(10 ** decimals);
