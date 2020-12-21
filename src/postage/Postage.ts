import PaymentProtocol from 'bitcore-payment-protocol'
import Mnemonic from 'bitcore-mnemonic'
import bitcore from 'bitcore-lib-cash'
import { log } from './../logger';

import Transaction from './../transaction/Transaction'
import INetwork from './../network/INetwork'
import BCHDNetwork from './../network/BCHDNetwork'
import IPostage from './IPostage'

export default class Postage implements IPostage {
    config: any
    network: INetwork
    transaction: Transaction
    hdNode: any

    constructor(config: any) {
        this.config = config
        this.network = new BCHDNetwork(this.config)
        this.transaction = new Transaction(this.config.postage)

        const code = new Mnemonic(config.postage.mnemonic)
        this.hdNode = code.toHDPrivateKey()
    }

    getRates(): any {
        return this.config.postage.postageRate
    }

    async addStampsToTxAndBroadcast(rawIncomingPayment: Buffer): Promise<any> {
        const cashAddress = this.hdNode.privateKey.toAddress().toString()

        const paymentProtocol = new PaymentProtocol('BCH')
        const payment = PaymentProtocol.Payment.decode(rawIncomingPayment)
        const incomingTransactionBitcore = new bitcore.Transaction(payment.transactions[0].toString('hex'))

        // TODO this doesn't do what is expected
        // await this.network.validateSLPInputs(incomingTransaction.ins)

        const neededStampsForTransaction = this.transaction.getNeededStamps(incomingTransactionBitcore)
        const stamps = await this.network.fetchUTXOsForNumberOfStampsNeeded(neededStampsForTransaction, cashAddress)
        const stampedTransaction = this.transaction.buildTransaction(incomingTransactionBitcore, stamps, this.hdNode)
        const transactionId = await this.network.broadcastTransaction(stampedTransaction)

        const memo = `Transaction Broadcasted: https://explorer.bitcoin.com/bch/tx/${transactionId}`
        payment.transactions[0] = stampedTransaction
        const paymentAck = paymentProtocol.makePaymentACK({ payment, memo }, 'BCH')

        return paymentAck.serialize()
    }

    async generateStamps(): Promise<void> {
        const cashAddress = this.hdNode.privateKey.toAddress().toString()

        log.info('Generating stamps...')
        try {
            const utxosToSplit = await this.network.fetchUTXOsForStampGeneration(cashAddress)
            const splitTransaction = this.transaction.splitUtxosIntoStamps(utxosToSplit, this.hdNode)
            const txid = await this.network.broadcastTransaction(splitTransaction);
            log.info(`Broadcasted split tx: ${txid}`);
        } catch (e) {
            log.error(e.message || e.error || e)
        }
    }
}
