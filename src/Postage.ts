import PaymentProtocol from 'bitcore-payment-protocol';
import Mnemonic from 'bitcore-mnemonic';
import bitcore from 'bitcore-lib-cash';
import { Config } from './../config';
import { Log } from './../log';

import Transaction from './../transaction/Transaction';
import INetwork from './../network/INetwork';
import BCHDNetwork from './../network/BCHDNetwork';
import IPostage from './IPostage';
import INetUtxo from '../network/INetUtxo';

export default class Postage implements IPostage {
    network: INetwork
    tx: Transaction
    hdNode: bitcore.HDPrivateKey;

    constructor() {
        this.network = new BCHDNetwork();
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
            Log.info(`Broadcasted split tx: ${txid}`);
        } catch (e) {
            Log.error(e.message || e.error || e);
        }
    }
}
