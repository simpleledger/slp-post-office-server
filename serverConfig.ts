require('dotenv').config()

import postageConfig from './config.json'

const config = {
    port: process.env.SERVER_PORT,
    bchd: {
        server: process.env.BCHD_SERVER,
    },
    postage: postageConfig,
}

export { config }
