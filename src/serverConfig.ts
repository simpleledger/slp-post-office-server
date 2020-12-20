require('dotenv').config()

import CoinFlexFLEXApiWrapper from './tokenPriceFeeder/ApiWrapper/CoinflexFLEXApiWrapper'
import BitcoinComSpiceApiWrapper from './tokenPriceFeeder/ApiWrapper/BitcoinComSpiceApiWrapper'
import CoinexUSDTApiWrapper from './tokenPriceFeeder/ApiWrapper/CoinexUSDTApiWrapper'

const config = {
    port: process.env.SERVER_PORT,
    bchd: {
        server: process.env.BCHD_SERVER,
    },
    postage: {
        mnemonic: process.env.MNEMONIC,
        network: process.env.NETWORK,
        postageRate: {
            version: 1,
            address: process.env.ADDRESS,
            weight: 365,
            transactionttl: 30,
            stamps: [
                {
                    name: "Spice",
                    symbol: "SPICE",
                    tokenId: "4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf",
                    decimals: 8,
                    rate: 10
                }
            ]
        }
    },
    priceFeeders: [
        /*
        // FLEX / coinflex.com
        {
            "tokenId": "fb1813fd1a53c1bed61f15c0479cc5315501e6da6a4d06da9d8122c1a4fabb6c",
            "feederClass": CoinFlexFLEXApiWrapper,
            "useInitialStampRateAsMin": true
        },
        */

        /*
        // SPICE / exchange.bitcoin.com
        {
            "tokenId": "4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf",
            "feederClass": BitcoinComSpiceApiWrapper,
            "useInitialStampRateAsMin": true
        }
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
    ]
}

export { config }
