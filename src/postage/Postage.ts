import PaymentProtocol from 'bitcore-payment-protocol'
import bitcoinCashJsLib from 'bitcoincashjs-lib'
import BCHJS from '@chris.troutner/bch-js'

import Transaction from './../transaction/Transaction'
import INetwork from './../network/INetwork'
import BITBOXNetwork from './../network/BITBOXNetwork'
import IPostage from './IPostage'

export default class Postage implements IPostage {
    bchjs: any
    config: any
    network: INetwork
    transaction: Transaction
    hdNode: any

    constructor(config: any) {
        this.config = config
        this.bchjs = new BCHJS()
        this.network = new BITBOXNetwork(this.config)
        this.transaction = new Transaction(this.config)
    }

    getRates(): any {
        return this.config.postageRate
    }

    async addStampsToTxAndBroadcast(rawIncomingPayment: Buffer): Promise<any> {
        const rootSeed = await this.bchjs.Mnemonic.toSeed(this.config.mnemonic)
        const hdNode = this.bchjs.HDNode.fromSeed(rootSeed)
        const keyPair = this.bchjs.HDNode.toKeyPair(hdNode)
        const cashAddress = this.bchjs.HDNode.toCashAddress(hdNode)

        const paymentProtocol = new PaymentProtocol('BCH')
        const payment = PaymentProtocol.Payment.decode(rawIncomingPayment)
        const incomingTransaction = bitcoinCashJsLib.Transaction.fromHex(payment.transactions[0].toString('hex'))

        // TODO this doesn't do what is expected
        // await this.network.validateSLPInputs(incomingTransaction.ins)

        const neededStampsForTransaction = this.transaction.getNeededStamps(incomingTransaction)
        const stamps = await this.network.fetchUTXOsForNumberOfStampsNeeded(neededStampsForTransaction, cashAddress)
        const stampedTransaction = this.transaction.buildTransaction(incomingTransaction, stamps, keyPair)
        const transactionId = await this.network.broadcastTransaction(stampedTransaction)

        const memo = `Transaction Broadcasted: https://explorer.bitcoin.com/bch/tx/${transactionId}`
        payment.transactions[0] = stampedTransaction
        const paymentAck = paymentProtocol.makePaymentACK({ payment, memo }, 'BCH')

        return paymentAck.serialize()
    }

    async generateStamps(): Promise<void> {
        const rootSeed = await this.bchjs.Mnemonic.toSeed(this.config.mnemonic)
        const hdNode = this.bchjs.HDNode.fromSeed(rootSeed)
        const cashAddress = this.bchjs.HDNode.toCashAddress(hdNode)

        console.log('Generating stamps...')
        try {
            const utxosToSplit = await this.network.fetchUTXOsForStampGeneration(cashAddress)
            const splitTransaction = this.transaction.splitUtxosIntoStamps(utxosToSplit, hdNode)
            await this.network.broadcastTransaction(splitTransaction)
        } catch (e) {
            console.error(e.message || e.error || e)
        }
    }
}
