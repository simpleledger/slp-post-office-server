import express = require('express')
import cors = require('cors')
import slpMiddleware from './src/slpMiddleware'
import PaymentProtocol from 'bitcore-payment-protocol'
import errorMessages from './src/errorMessages'
import { Transaction } from 'bitcoincashjs-lib'
import { getNeededStamps, buildTransaction, splitUtxosIntoStamps } from './src/transaction'
import Network from './src/network/Network'
import BCHJS from '@chris.troutner/bch-js'
import config from './config.json'

const bchjs = new BCHJS({
    restURL: config.network === 'mainnet' ? 'https://api.fullstack.cash/v3/' : 'https://tapi.fullstack.cash/v3/',
    apiToken: config.apiKey,
})

const app: express.Application = express()
app.use(cors())
app.use(slpMiddleware)

app.get('/postage', function(req: express.Request, res: express.Response): void {
    res.send(config.postageRate)
})

app.post('/postage', async function(req: any, res: express.Response) {
    const paymentProtocol = new PaymentProtocol('BCH')
    try {
        if (!req.is('application/simpleledger-payment')) {
            res.status(400).send(errorMessages.UNSUPPORTED_CONTENT_TYPE)
            return
        }
        const network = new Network()

        const rootSeed = await bchjs.Mnemonic.toSeed(config.mnemonic)
        const hdNode = bchjs.HDNode.fromSeed(rootSeed)
        const keyPair = bchjs.HDNode.toKeyPair(hdNode)
        const payment = PaymentProtocol.Payment.decode(req.raw)
        const incomingTransaction = Transaction.fromHex(payment.transactions[0].toString('hex'))
        await network.validateSLPInputs(incomingTransaction.ins)
        const neededStampsForTransaction = getNeededStamps(incomingTransaction)
        const stamps = await network.fetchUTXOsForNumberOfStampsNeeded(
            neededStampsForTransaction,
            bchjs.HDNode.toCashAddress(hdNode),
        )
        const stampedTransaction = buildTransaction(incomingTransaction, stamps, keyPair)
        const transactionId = await network.broadcastTransaction(stampedTransaction)
        const memo = `Transaction Broadcasted: https://explorer.bitcoin.com/bch/tx/${transactionId}`
        payment.transactions[0] = stampedTransaction
        const paymentAck = paymentProtocol.makePaymentACK({ payment, memo }, 'BCH')
        res.status(200).send(paymentAck.serialize())
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
    const rootSeed = await bchjs.Mnemonic.toSeed(config.mnemonic)
    const hdNode = bchjs.HDNode.fromSeed(rootSeed)
    const cashAddress = bchjs.HDNode.toCashAddress(hdNode)

    const generateStamps = async () => {
        console.log('Generating stamps...')
        try {
            const network = new Network()
            const utxosToSplit = await network.fetchUTXOsForStampGeneration(cashAddress)
            const splitTransaction = splitUtxosIntoStamps(utxosToSplit, hdNode)
            await network.broadcastTransaction(splitTransaction)
        } catch (e) {
            console.error(e.message || e.error || e)
        }
    }

    const stampGenerationIntervalInMinutes = 30
    setInterval(generateStamps, 1000 * 60 * stampGenerationIntervalInMinutes)

    console.log(`Send stamps to: ${bchjs.HDNode.toCashAddress(hdNode)}`)
    console.log('Post Office listening on port 3000!')
    generateStamps()
})
