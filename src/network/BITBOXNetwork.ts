import errorMessages from '../errorMessages'
import BCHJS from '@chris.troutner/bch-js'
import config from '../../config.json'
import INetwork from './INetwork'
import INetUtxo from './INetUtxo'

export default class BITBOXNetwork implements INetwork {
    static MIN_BYTES_INPUT = 181

    bchjs: any
    config: any

    constructor(config: any) {
        this.config = config
        this.bchjs = new BCHJS({
            restURL:
                this.config.network === 'mainnet'
                    ? 'https://api.fullstack.cash/v3/'
                    : 'https://tapi.fullstack.cash/v3/',
            apiToken: this.config.apiKey,
        })
    }

    async fetchUTXOsForStampGeneration(cashAddress: string): Promise<INetUtxo[]> {
        const utxoResponse = await this.bchjs.Electrumx.utxo(cashAddress)
        const utxos = utxoResponse.utxos.filter(utxo => utxo.value > config.postageRate.weight * 2)
        if (utxos.length <= 0) {
            throw new Error('Insufficient Balance for Stamp Generation')
        }
        return utxos
    }

    async fetchUTXOsForNumberOfStampsNeeded(numberOfStamps: number, cashAddress: string): Promise<INetUtxo[]> {
        const utxoResponse = await this.bchjs.Electrumx.utxo(cashAddress)
        const txIds = utxoResponse.utxos.map(utxo => utxo.tx_hash).splice(0, numberOfStamps)
        const areSlpUtxos = await this.bchjs.SLP.Utils.validateTxid(txIds)
        const filteredTxIds = areSlpUtxos
            .filter(tokenUtxo => tokenUtxo.valid === false)
            .map(tokenUtxo => tokenUtxo.txid)
        const stamps = utxoResponse.utxos.filter(utxo => filteredTxIds.includes(utxo.tx_hash))
        if (stamps.length < numberOfStamps) {
            throw new Error(errorMessages.UNAVAILABLE_STAMPS)
        }
        return stamps.slice(0, numberOfStamps)
    }

    async validateSLPInputs(inputs: any): Promise<void> {
        const txIds = inputs.map(input => {
            const hash = Buffer.from(input.hash)
            return hash.reverse().toString('hex')
        })
        const validateResponse = await this.bchjs.SLP.Utils.validateTxid(txIds)
        validateResponse.forEach(response => {
            if (!response.valid) throw new Error(errorMessages.INVALID_PAYMENT)
        })
    }

    async broadcastTransaction(rawTransaction: Buffer): Promise<string> {
        console.log('Broadcasting transaction...')
        const transactionId = await this.bchjs.RawTransactions.sendRawTransaction(rawTransaction.toString('hex'))
        console.log(`https://explorer.bitcoin.com/bch/tx/${transactionId}`)
        return transactionId
    }
}
