import PaymentProtocol from 'bitcore-payment-protocol';
import Mnemonic from 'bitcore-mnemonic';
import bitcore from 'bitcore-lib-cash';

import { Config } from './Config';
import { Log } from './Log';
import Transaction from './Transaction';
import AbstractNetwork from './Network/AbstractNetwork';
import BCHDNetwork from './Network/BCHDNetwork';
import INetUtxo from './Network/INetUtxo';

export default class Postage {
    network: AbstractNetwork;
    tx: Transaction;
    hdNode: bitcore.HDPrivateKey;

    constructor(network: AbstractNetwork) {
        this.network = network;
        this.tx = new Transaction();

        const code = new Mnemonic(Config.postage.mnemonic);
        this.hdNode = code.toHDPrivateKey();
    }

    async addStampsToTxAndBroadcast(rawIncomingPayment: Buffer): Promise<any> {
        // @ts-ignore
        const cashAddress = this.hdNode.privateKey.toAddress().toString();

        const paymentProtocol = new PaymentProtocol('BCH');
        const payment = PaymentProtocol.Payment.decode(rawIncomingPayment);
        const incomingTransactionBitcore = new bitcore.Transaction(payment.transactions[0].toString('hex'));

        // TODO this doesn't do what is expected
        // await this.network.validateSLPInputs(incomingTransaction.ins)

        const neededStampsForTransaction: number = this.tx.getNeededStamps(incomingTransactionBitcore);
        const stamps: INetUtxo[] = await this.network.fetchUTXOsForNumberOfStampsNeeded(neededStampsForTransaction, cashAddress);
        const stampedTransaction: bitcore.Transaction = this.tx.addStampsForTransactionAndSignInputs(incomingTransactionBitcore, this.hdNode, stamps);
        const txBuf: Buffer = stampedTransaction.toBuffer();
        const txId: string = await this.network.broadcastTransaction(txBuf);

        payment.transactions[0] = txBuf;
        const paymentAck = paymentProtocol.makePaymentACK({ payment, memo: Config.postage.memo }, 'BCH');

        return paymentAck.serialize();
    }

    async generateStamps(): Promise<void> {
        // @ts-ignore
        const cashAddress = this.hdNode.privateKey.toAddress().toString();

        Log.info('Generating stamps...');
        try {
            const utxosToSplit: INetUtxo[] = await this.network.fetchUTXOsForStampGeneration(cashAddress);
            const splitTx: bitcore.Transaction = this.tx.splitUtxosIntoStamps(utxosToSplit, this.hdNode);
            const txid: string = await this.network.broadcastTransaction(Buffer.from(splitTx.serialize(), 'hex'));
            Log.info(`Broadcasted stamp split tx: ${txid}`);
        } catch (e) {
            Log.error(e.message || e.error || e);
        }
    }
}
