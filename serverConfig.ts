require('dotenv').config()

import postageConfig from './config.json'
import CoinFlexApiWrapper from './src/tokenPriceFeeder/ApiWrapper/CoinflexApiWrapper'

const config = {
    port: process.env.SERVER_PORT,
    bchd: {
        server: process.env.BCHD_SERVER,
    },
    postage: postageConfig,
    priceFeeders: [
        {
            "tokenId": "fb1813fd1a53c1bed61f15c0479cc5315501e6da6a4d06da9d8122c1a4fabb6c",
            "feederClass": CoinFlexApiWrapper,
            "useInitialStampRateAsMin": true
        },
    ]
}

export { config }
