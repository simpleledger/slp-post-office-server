require('dotenv').config();

import bitcore from 'bitcore-lib-cash';
import Mnemonic from 'bitcore-mnemonic';
import { BigNumber } from 'bignumber.js';

/// HERE YOU CAN ADD YOUR CUSTOM TOKEN PRICE FEEDERS
/// TO USE THEM, CONFIGURE THEM AS SHOWN INSIDE CONFIG BELOW

// import CoinFlexFLEXApiWrapper from './TokenPriceFeeder/ApiWrapper/CoinflexFLEXApiWrapper'
import BitcoinComSpiceApiWrapper from './TokenPriceFeeder/ApiWrapper/BitcoinComSpiceApiWrapper'
// import CoinexUSDTApiWrapper from './TokenPriceFeeder/ApiWrapper/CoinexUSDTApiWrapper'

export interface StampConfig {
    name: string;
    symbol: string;
    tokenId: string;
    decimals: number;
    rate: BigNumber;
}

export interface PostageConfig {
    memo: string;
    network: string;
    stampGenerationIntervalSeconds: number;
    hdNode: bitcore.HDPrivateKey;
}

export interface PostageRateConfig {
    version: number;
    address: string;
    weight: number;
    transactionttl: number;
    stamps: StampConfig[];
}

export interface PriceFeederConfig {
    tick?: number;
    tokenId: string;
    feederClass: any; // TODO make better typed
    useInitialStampRateAsMin?: boolean;
    rule?: (n: BigNumber) => BigNumber;
}

export interface ServerConfig {
    server: {
        port: number;
        host: string;
        limitEvery: number;
        limitMaxReqs: number;
    };

    bchd: {
        server: string;
    };

    postage: PostageConfig;
    postageRate: PostageRateConfig;
    priceFeeders: PriceFeederConfig[];
}

const Config: ServerConfig = {
    server: {
        port: Number(process.env.SERVER_PORT ? process.env.SERVER_PORT : 3000),
        host: process.env.SERVER_HOST ? process.env.SERVER_HOST : '0.0.0.0',
        limitEvery: 15 * 60 * 1000,
        limitMaxReqs: 100,
    },
    bchd: {
        server: process.env.BCHD_SERVER,
    },
    postage: {
        hdNode: new Mnemonic(process.env.MNEMONIC).toHDPrivateKey(),
        network: process.env.NETWORK,
        memo: process.env.MEMO,
        stampGenerationIntervalSeconds: Number(process.env.STAMP_GENERATION_INTERVAL ? process.env.STAMP_GENERATION_INTERVAL : 600),
    },
    postageRate: {
        version: 1,
        address: process.env.ADDRESS,
        weight: 365,
        transactionttl: 30,
        stamps: [
            // Here you should enumerate all of the tokens you'd like to support
            // you can have the rate be updated regularly by using the priceFeeders config below
            {
                name: "Spice",
                symbol: "SPICE",
                tokenId: "4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf",
                decimals: 8,
                // cost per satoshi in slp base units 
                // base units are the token prior to having decimals applied to it
                // spice has 8 decimals, so for each 1 spice there are 10^8 base units of spice
                rate: new BigNumber(10)
            }
        ]
    },
    priceFeeders: [
        // SPICE / exchange.bitcoin.com
        // for demonstration purposes, you should disable if not using SPICE
        {
            tick: 5, // how often to update price (in seconds)
            tokenId: "4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf",
            feederClass: BitcoinComSpiceApiWrapper, // reference the associated TokenPriceFeeder
            useInitialStampRateAsMin: false, // if true: prevent going under the specified rate in postageRate.stamps

            // you may apply a custom rule that takes a price (in BCH) and applies some modification to it.
            // for this case, we just multiply the price 1.9x, giving us a ~0.9% profit
            // if no custom rule is provided a default of 2x will be done
            rule: (n: BigNumber) => new BigNumber(0.00000546).dividedBy(n).times(1.9),
        },

        /*
        // FLEX / coinflex.com
        {
            "tokenId": "fb1813fd1a53c1bed61f15c0479cc5315501e6da6a4d06da9d8122c1a4fabb6c",
            "feederClass": CoinFlexFLEXApiWrapper,
            "useInitialStampRateAsMin": true
        },
        */

        /*
        // USDT / coinex.com
        {
            "tokenId": "9fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c11",
            "feederClass": CoinexUSDTApiWrapper,
            "useInitialStampRateAsMin": true
        }
        */

        /*
         * Add your own implementations here...
         */
    ],
};

export { Config };
