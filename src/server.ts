import express = require('express')
import cors = require('cors')
import { Mutex } from 'async-mutex'
import slpMiddleware from './slpMiddleware'
import errorMessages from './errorMessages'
import Postage from './postage/Postage'
import TokenPriceFeeder from './tokenPriceFeeder/TokenPriceFeeder'
import { Config } from './config'
import { log } from './logger';

const app: express.Application = express()
app.use(cors())
app.use(slpMiddleware)
const mutex = new Mutex()

app.get('/postage', function(req: express.Request, res: express.Response): void {
    const postage = new Postage()
    res.send(postage.getRates())
})

app.post('/postage', async function(req: any, res: express.Response) {
    try {
        if (!req.is('application/simpleledger-payment')) {
            res.status(400).send(errorMessages.UNSUPPORTED_CONTENT_TYPE)
            return
        }
        const release = await mutex.acquire()
        try {
            const postage = new Postage()
            const serializedPaymentAck = await postage.addStampsToTxAndBroadcast(req.raw)
            res.status(200).send(serializedPaymentAck)
        } finally {
            release()
        }
    } catch (e) {
        log.error(e)
        if (Object.values(errorMessages).includes(e.message)) {
            res.status(400).send(e.message)
        } else {
            res.status(500).send(e.message)
        }
    }
})

/*
 * INITIALIZE SERVER
 */

Config.priceFeeders.forEach(priceFeeder => {
    const tokenPriceFeeder = new TokenPriceFeeder(
        100,
        priceFeeder.tokenId,
        new priceFeeder.feederClass(),
        priceFeeder.useInitialStampRateAsMin
    )
    tokenPriceFeeder.run()
})

const postage = new Postage(Config)
const cashAddress = postage.hdNode.privateKey.toAddress().toString()
log.info(`Send stamps to: ${cashAddress}`)

const stampGenerationIntervalInMinutes = 30;
setInterval(postage.generateStamps, 1000 * 60 * stampGenerationIntervalInMinutes)
postage.generateStamps();

const server = app.listen(Config.server.port, Config.server.host, async () => {
    log.info(`Post Office listening ${Config.server.host}:${Config.server.port}`);
})

let connections = [];
server.on('connection', connection => {
    connections.push(connection);
    connection.on('close', () => connections = connections.filter(curr => curr !== connection));
});

function shutDown() {
    log.info('Received kill signal, shutting down gracefully');
    server.close(() => {
        log.info('Closed out remaining connections');
        process.exit(0);
    });

    setTimeout(() => {
        log.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);

    connections.forEach(curr => curr.end());
    setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
}

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
