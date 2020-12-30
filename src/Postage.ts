import PaymentProtocol from 'bitcore-payment-protocol';
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

    constructor(config: ServerConfig, network: AbstractNetwork) {
        this.config = config;
        this.network = network;
        this.postageTx = new PostageTransaction(this.config);
    }

    getPostageRate(): PostageRateConfig {
        return this.config.postageRate;
    }

    getDepositAddress(): bitcore.Address {
        return this.config.postage.privateKey.toAddress();
    }

    async addStampsToTxAndBroadcast(rawIncomingPayment: Buffer): Promise<any> {
        const paymentProtocol = new PaymentProtocol('BCH');
        const payment = PaymentProtocol.Payment.decode(rawIncomingPayment);
        const incomingTx = new bitcore.Transaction(payment.transactions[0].toString('hex'));

        // TODO this doesn't do what is expected
        // await this.network.validateSLPInputs(incomingTransaction.ins)

        const neededStampsForTx: number = this.postageTx.getNeededStamps(incomingTx);
        const stamps: INetUtxo[] = await this.network.fetchUTXOsForNumberOfStampsNeeded(neededStampsForTx, this.getDepositAddress());

        let stampedTx: bitcore.Transaction = this.postageTx.addStampsForTransaction(incomingTx, stamps);
        stampedTx = this.postageTx.signInputs(stampedTx, stamps);

        const txBuf: Buffer = stampedTx.toBuffer();
        await this.network.broadcastTransaction(txBuf);

        payment.transactions[0] = txBuf;
        const paymentAck = paymentProtocol.makePaymentACK({ payment, memo: this.config.postage.memo }, 'BCH');

        return paymentAck.serialize();
    }

    async generateStamps(): Promise<void> {
        try {
            const utxos: INetUtxo[] = await this.network.fetchUTXOsForStampGeneration(this.getDepositAddress());

            if (utxos.length <= 0) {
                Log.debug('Stamp Generation did not run due to lack of utxos');
                return;
            }

            const splitTx: bitcore.Transaction = this.postageTx.splitUtxosIntoStamps(utxos);
            const txid: string = await this.network.broadcastTransaction(Buffer.from(splitTx.serialize(), 'hex'));
            Log.info(`Broadcasted stamp split tx: ${txid}`);
        } catch (e) {
            Log.error(e.message || e.error || e);
        }
    }
}
