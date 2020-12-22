import bitcore from 'bitcore-lib-cash'
import errorMessages from '../errorMessages'
import { GrpcClient } from 'grpc-bchrpc-node'
import { Config } from './../config'
import { log } from './../logger';
import INetwork from './INetwork'
import INetUtxo from './INetUtxo'

export default class BCHDNetwork implements INetwork {
    static MIN_BYTES_INPUT = 181

    bchd: GrpcClient;

    constructor() {
        this.bchd = new GrpcClient({ url: Config.bchd.server })
    }

    private async checkServerSLPIndexingEnabled(): Promise<void> {
        const res = await this.bchd.getBlockchainInfo()

        if (res.getSlpIndex() == false) {
            throw new Error('The BCHD server does not have SLP support enabled')
        }
    }

    async fetchUTXOsForStampGeneration(cashAddress: string): Promise<INetUtxo[]> {
        await this.checkServerSLPIndexingEnabled()

        const res = await this.bchd.getAddressUtxos({
            address: cashAddress,
            includeMempool: true,
            includeTokenMetadata: true,
        })

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
            .filter(u => u.value > Config.postage.postageRate.weight * 2)

        log.debug(utxos)

        if (utxos.length <= 0) {
            throw new Error('Insufficient Balance for Stamp Generation')
        }
        return utxos
    }

    async fetchUTXOsForNumberOfStampsNeeded(numberOfStamps: number, cashAddress: string): Promise<INetUtxo[]> {
        await this.checkServerSLPIndexingEnabled()

        const res = await this.bchd.getAddressUtxos({
            address: cashAddress,
            includeMempool: true,
            includeTokenMetadata: true,
        })

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

        if (utxos.length < numberOfStamps) {
            throw new Error(errorMessages.UNAVAILABLE_STAMPS)
        }

        return utxos.slice(0, numberOfStamps)
    }

    async validateSLPInputs(inputs: bitcore.Transaction.Input[]): Promise<void> {
        // bchd already provides us slp valid inputs
    }

    async broadcastTransaction(rawTransaction: Buffer): Promise<string> {
        log.info(`Broadcasting transaction: ${rawTransaction.toString('hex')}`);
        const res = await this.bchd.submitTransaction({
            txnBuf: rawTransaction,
        })

        const transactionId = Buffer.from(res.getHash_asU8().reverse()).toString('hex')

        log.info(`https://explorer.bitcoin.com/bch/tx/${transactionId}`)
        return transactionId
    }
}
