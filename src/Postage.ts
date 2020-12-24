import PaymentProtocol from 'bitcore-payment-protocol';
import Mnemonic from 'bitcore-mnemonic';
import bitcore from 'bitcore-lib-cash';

import { ServerConfig, PostageRateConfig } from './Config';
import { Log } from './Log';
import PostageTransaction from './PostageTransaction';
import AbstractNetwork from './Network/AbstractNetwork';
import BCHDNetwork from './Network/BCHDNetwork';
import INetUtxo from './Network/INetUtxo';

export default class Postage {
    config: ServerConfig;
    network: AbstractNetwork;
    postageTx: PostageTransaction;
    hdNode: bitcore.HDPrivateKey;

    constructor(config: ServerConfig, network: AbstractNetwork) {
        this.config = config;
        this.network = network;
        this.postageTx = new PostageTransaction(this.config);

        const code = new Mnemonic(this.config.postage.mnemonic);
        this.hdNode = code.toHDPrivateKey();
    }

    getPostageRate(): PostageRateConfig {
        return this.config.postageRate;
    }

    async addStampsToTxAndBroadcast(rawIncomingPayment: Buffer): Promise<any> {
        const cashAddress = this.hdNode.privateKey.toAddress().toString();

        const paymentProtocol = new PaymentProtocol('BCH');
        const payment = PaymentProtocol.Payment.decode(rawIncomingPayment);
        const incomingTx = new bitcore.Transaction(payment.transactions[0].toString('hex'));

        // TODO this doesn't do what is expected
        // await this.network.validateSLPInputs(incomingTransaction.ins)

        const neededStampsForTx: number = this.postageTx.getNeededStamps(incomingTx);
        const stamps: INetUtxo[] = await this.network.fetchUTXOsForNumberOfStampsNeeded(neededStampsForTx, cashAddress);
        const stampedTx: bitcore.Transaction = this.postageTx.addStampsForTransactionAndSignInputs(incomingTx, this.hdNode, stamps);

        const txBuf: Buffer = stampedTx.toBuffer();
        const txId: string = await this.network.broadcastTransaction(txBuf);
        payment.transactions[0] = txBuf;
        const paymentAck = paymentProtocol.makePaymentACK({ payment, memo: this.config.postage.memo }, 'BCH');

        return paymentAck.serialize();
    }

    async generateStamps(): Promise<void> {
        const cashAddress = this.hdNode.privateKey.toAddress().toString();

        Log.info('Generating stamps...');
        try {
            const utxosToSplit: INetUtxo[] = await this.network.fetchUTXOsForStampGeneration(cashAddress);
            const splitTx: bitcore.Transaction = this.postageTx.splitUtxosIntoStamps(utxosToSplit, this.hdNode);
            const txid: string = await this.network.broadcastTransaction(Buffer.from(splitTx.serialize(), 'hex'));
            Log.info(`Broadcasted stamp split tx: ${txid}`);
        } catch (e) {
            Log.error(e.message || e.error || e);
        }
    }
}
