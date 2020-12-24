import bitcore from 'bitcore-lib-cash';
import errorMessages from '../ErrorMessages';
import { GrpcClient } from 'grpc-bchrpc-node';
import { ServerConfig } from './../Config';
import { Log } from './../Log';
import INetUtxo from './INetUtxo';
import AbstractNetwork from './AbstractNetwork';

export default class BCHDNetwork implements AbstractNetwork {
    static MIN_BYTES_INPUT = 181

    config: ServerConfig;
    bchd: GrpcClient;

    constructor(config: ServerConfig) {
        this.config = config;
        this.bchd = new GrpcClient({ url: this.config.bchd.server });
    }

    private async checkServerSLPIndexingEnabled(): Promise<void> {
        const res = await this.bchd.getBlockchainInfo();

        if (res.getSlpIndex() == false) {
            throw new Error('The BCHD server does not have SLP support enabled');
        }
    }

    async fetchUTXOsForStampGeneration(address: bitcore.Address): Promise<INetUtxo[]> {
        await this.checkServerSLPIndexingEnabled();

        const res = await this.bchd.getAddressUtxos({
            address: address.toString(),
            includeMempool: true,
            includeTokenMetadata: true,
        });

        const utxos: INetUtxo[] = res
            .getOutputsList()
            .filter(u => u.getSlpToken() == undefined) // get only non-slp utxos
            .map(u => ({
                tx_hash: Buffer.from(
                    u
                        .getOutpoint()!
                        .getHash_asU8()
                        .reverse(),
                ).toString('hex'),
                tx_pos: u.getOutpoint()!.getIndex(),
                value: u.getValue(),
                height: u.getBlockHeight() < 2147483647 ? u.getBlockHeight() : -1,
                script: Buffer.from(u.getPubkeyScript_asU8()).toString('hex'),
            }))
            .filter(u => u.value > this.config.postageRate.weight * 2);

        Log.debug(utxos);

        if (utxos.length <= 0) {
            throw new Error('Insufficient Balance for Stamp Generation');
        }
        return utxos;
    }

    async fetchUTXOsForNumberOfStampsNeeded(numberOfStamps: number, address: bitcore.Address): Promise<INetUtxo[]> {
        await this.checkServerSLPIndexingEnabled();

        const res = await this.bchd.getAddressUtxos({
            address: address.toString(),
            includeMempool: true,
            includeTokenMetadata: true,
        });

        const utxos: INetUtxo[] = res
            .getOutputsList()
            .filter(u => u.getSlpToken() == undefined) // get only non-slp utxos
            .map(u => ({
                tx_hash: Buffer.from(
                    u
                        .getOutpoint()!
                        .getHash_asU8()
                        .reverse(),
                ).toString('hex'),
                tx_pos: u.getOutpoint()!.getIndex(),
                value: u.getValue(),
                height: u.getBlockHeight() < 2147483647 ? u.getBlockHeight() : -1,
                script: Buffer.from(u.getPubkeyScript_asU8()).toString('hex'),
            }));

        if (utxos.length < numberOfStamps) {
            throw new Error(errorMessages.UNAVAILABLE_STAMPS);
        }

        return utxos.slice(0, numberOfStamps);
    }

    async validateSLPInputs(inputs: bitcore.Transaction.Input[]): Promise<void> {
        // bchd already provides us slp valid inputs
    }

    async broadcastTransaction(rawTransaction: Buffer): Promise<string> {
        Log.debug(`Broadcasting transaction: ${rawTransaction.toString('hex')}`);

        const res = await this.bchd.submitTransaction({
            txnBuf: rawTransaction,
        });

        const txId = Buffer.from(res.getHash_asU8().reverse()).toString('hex');

        Log.info(`broadcasted ${txId}`);
        return txId;
    }
}
