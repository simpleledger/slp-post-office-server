import bitcore from 'bitcore-lib-cash';
import { BigNumber } from 'bignumber.js';
import { Config, PostageConfig, PostageRateConfig } from './../../src/Config'

const mockPostageConfig: PostageConfig = {
    network: 'mainnet',
    memo: "MOCK Postage",
    stampGenerationIntervalSeconds: 40,
    privateKey: bitcore.PrivateKey.fromWIF('KxNmTLoGeyonWiiKbb3D1UjPcrv8B4wgdf3ExzfejvrZHruCWo1D'),
};

const mockPostageRateConfig: PostageRateConfig = {
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
};

Config.postage = mockPostageConfig;
Config.postageRate = mockPostageRateConfig;

export default Config;
