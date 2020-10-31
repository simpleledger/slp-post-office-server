import express = require('express')
import cors = require('cors')
import slpMiddleware from './src/slpMiddleware'
import errorMessages from './src/errorMessages'
import Postage from './src/postage/Postage'
import config from './config.json'

const app: express.Application = express()
app.use(cors())
app.use(slpMiddleware)

app.get('/postage', function(req: express.Request, res: express.Response): void {
    const postage = new Postage(config)
    res.send(postage.getRates())
})

app.post('/postage', async function(req: any, res: express.Response) {
    try {
        if (!req.is('application/simpleledger-payment')) {
            res.status(400).send(errorMessages.UNSUPPORTED_CONTENT_TYPE)
            return
        }
        const postage = new Postage(config)
        const serializedPaymentAck = await postage.addStampsToTxAndBroadcast(req.raw)
        res.status(200).send(serializedPaymentAck)
    } catch (e) {
        console.error(e)
        if (Object.values(errorMessages).includes(e.message)) {
            res.status(400).send(e.message)
        } else {
            res.status(500).send(e.message)
        }
    }
})

app.listen(3000, async () => {
    const postage = new Postage(config)

    const rootSeed = await postage.bchjs.Mnemonic.toSeed(postage.config.mnemonic)
    const hdNode = postage.bchjs.HDNode.fromSeed(rootSeed)
    const cashAddress = postage.bchjs.HDNode.toCashAddress(hdNode)
    console.log(`Send stamps to: ${cashAddress}`)

    const stampGenerationIntervalInMinutes = 30
    setInterval(postage.generateStamps, 1000 * 60 * stampGenerationIntervalInMinutes)
    postage.generateStamps()

    console.log('Post Office listening on port 3000!')
})
