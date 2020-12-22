import PaymentProtocol from 'bitcore-payment-protocol'
import Mnemonic from 'bitcore-mnemonic'
import bitcore from 'bitcore-lib-cash'
import { Config } from './../config'
import { log } from './../logger';

import Transaction from './../transaction/Transaction'
import INetwork from './../network/INetwork'
import BCHDNetwork from './../network/BCHDNetwork'
import IPostage from './IPostage'
import INetUtxo from '../network/INetUtxo';

export default class Postage implements IPostage {
    network: INetwork
    transaction: Transaction
    hdNode: bitcore.HDPrivateKey;

    constructor() {
        this.network = new BCHDNetwork()
        this.transaction = new Transaction()

        const code = new Mnemonic(Config.postage.mnemonic)
        this.hdNode = code.toHDPrivateKey()
    }

    async addStampsToTxAndBroadcast(rawIncomingPayment: Buffer): Promise<any> {
        // @ts-ignore
        const cashAddress = this.hdNode.privateKey.toAddress().toString()

        const paymentProtocol = new PaymentProtocol('BCH')
        const payment = PaymentProtocol.Payment.decode(rawIncomingPayment)
        const incomingTransactionBitcore = new bitcore.Transaction(payment.transactions[0].toString('hex'))

        // TODO this doesn't do what is expected
        // await this.network.validateSLPInputs(incomingTransaction.ins)

        const neededStampsForTransaction: number = this.transaction.getNeededStamps(incomingTransactionBitcore)
        const stamps: INetUtxo[] = await this.network.fetchUTXOsForNumberOfStampsNeeded(neededStampsForTransaction, cashAddress)
        const stampedTransaction: bitcore.Transaction = this.transaction.addStampsForTransactionAndSignInputs(incomingTransactionBitcore, this.hdNode, stamps);
        const txBuf = stampedTransaction.toBuffer();
        const transactionId: string = await this.network.broadcastTransaction(txBuf);

        const memo = `Transaction Broadcasted: https://explorer.bitcoin.com/bch/tx/${transactionId}`
        payment.transactions[0] = txBuf
        const paymentAck = paymentProtocol.makePaymentACK({ payment, memo }, 'BCH')

        return paymentAck.serialize()
    }

    async generateStamps(): Promise<void> {
        // @ts-ignore
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
