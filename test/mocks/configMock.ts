import { BigNumber } from 'bignumber.js';
import { Config, PostageConfig } from './../../src/config'

const mockPostage: PostageConfig = {
    mnemonic: 'dsds',
    network: 'mainnet',
    postageRate: {
        version: 1,
        address: 'simpleledger:pr508v7nem4z67u82rh5qqtpcctzkw6gfvpl8d0ak5',
        weight: 365,
        transactionttl: 30,
        stamps: [
            {
                name: "USDt",
                symbol: "USDT",
                tokenId: "9fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c11",
                decimals: 8,
                rate: new BigNumber(1)
            }
        ]
    }
}

Config.postage = mockPostage;

export default Config;
