import errorMessages from '../errorMessages'
import config from '../../config.json'
import BCHJS from '@chris.troutner/bch-js'
import BigNumber from 'bignumber.js'
import ITransaction from './ITransaction'
const { TransactionBuilder, ECSignature } = require('bitcoincashjs-lib')

export default class Transaction implements ITransaction {
    static MIN_BYTES_INPUT = 181
    static LOKAD_ID_INDEX = 1
    static TOKEN_ID_INDEX = 4
    static LOKAD_ID_INDEX_VALUE = '534c5000'
    static SLP_OP_RETURN_VOUT = 0

    static bchjs = new BCHJS()

    
    addStampsForTransactionAndSignInputs(transaction: any, keyPairFromPostOffice: any, stamps: any): any {
        const lastSlpInputVin = transaction.inputs.length - 1
        for (let i = 0; i < stamps.length; i++) {
            transaction.addInput(stamps[i].tx_hash, stamps[i].tx_pos)
        }
    
        for (let i = lastSlpInputVin + 1; i <= stamps.length; i++) {
            let redeemScript
            console.log(`Signing...`, i)
            transaction.sign(
                i,
                keyPairFromPostOffice,
                redeemScript,
                0x01, // SIGHASH_ALL
                config.postageRate.weight + Transaction.MIN_BYTES_INPUT,
                ECSignature.ECDSA,
            )
        }
    
        return transaction
    }

    getNeededStamps(transaction: any): number {
        BigNumber.set({ ROUNDING_MODE: BigNumber.ROUND_UP })
        const transactionScript = Transaction.bchjs.Script.toASM(transaction.outs[Transaction.SLP_OP_RETURN_VOUT].script).split(' ')
        if (transactionScript[Transaction.LOKAD_ID_INDEX] !== Transaction.LOKAD_ID_INDEX_VALUE)
            throw new Error(errorMessages.INVALID_SLP_OP_RETURN)
    
        let neededStamps = 0
        let tokenOutputPostage = 0
        for (let i = 1; i < transaction.outs.length; i++) {
            const addressFromOut = Transaction.bchjs.SLP.Address.toSLPAddress(
                Transaction.bchjs.Address.fromOutputScript(transaction.outs[i].script),
            )
            const postOfficeAddress = config.postageRate.address
            if (postOfficeAddress === addressFromOut) tokenOutputPostage = Transaction.TOKEN_ID_INDEX + i
        }
        if (tokenOutputPostage === 0) throw new Error(errorMessages.INSUFFICIENT_POSTAGE)
    
        // Check if token being spent is the same as described in the postage rate for the stamp
        // Check if postage is being paid accordingly
        const postagePaymentTokenId = transactionScript[Transaction.TOKEN_ID_INDEX]
        const stampDetails =
            config.postageRate.stamps.filter(stamp => stamp.tokenId === postagePaymentTokenId).pop() || false
        const minimumStampsNeeded = transaction.outs.length - transaction.ins.length + 1
        if (stampDetails) {
            const stampRate = new BigNumber(stampDetails.rate).times(10 ** stampDetails.decimals)
            const amountPostagePaid = new BigNumber(transactionScript[tokenOutputPostage], 16).times(
                10 ** stampDetails.decimals,
            )
            if (amountPostagePaid.isLessThan(stampRate.times(minimumStampsNeeded))) {
                throw new Error(errorMessages.INSUFFICIENT_POSTAGE)
            }
            neededStamps = Number(amountPostagePaid.dividedBy(stampRate).toFixed(0))
        } else {
            throw new Error(errorMessages.UNSUPPORTED_SLP_TOKEN)
        }
    
        return neededStamps
    }

    splitUtxosIntoStamps(utxos: any, hdNode: any) {
            const transactionBuilder = config.network === 'mainnet' ? new Transaction.bchjs.TransactionBuilder() : new Transaction.bchjs.TransactionBuilder('testnet')

        const originalAmount = utxos.reduce((accumulator, utxo) => accumulator + utxo.value, 0)

        const numberOfPossibleStamps = originalAmount / (config.postageRate.weight + Transaction.MIN_BYTES_INPUT)
        const hypotheticalByteCount = Transaction.bchjs.BitcoinCash.getByteCount(
            { P2PKH: utxos.length },
            { P2PKH: numberOfPossibleStamps },
        )
        const satoshisPerByte = 1.4
        const hypotheticalTxFee = Math.floor(satoshisPerByte * hypotheticalByteCount)
        let numberOfActualStamps = (originalAmount - hypotheticalTxFee) / (config.postageRate.weight + Transaction.MIN_BYTES_INPUT)
        if (numberOfActualStamps > 100) {
            numberOfActualStamps = 50
        }

        utxos.forEach(utxo => transactionBuilder.addInput(utxo.tx_hash, utxo.tx_pos))
        const keyPair = Transaction.bchjs.HDNode.toKeyPair(hdNode)
        const outputAddress = Transaction.bchjs.HDNode.toCashAddress(hdNode)
        const byteCount = Transaction.bchjs.BitcoinCash.getByteCount({ P2PKH: utxos.length }, { P2PKH: numberOfActualStamps })
        const txFee = Math.floor(satoshisPerByte * byteCount)
        const totalSatoshisToSend = (config.postageRate.weight + Transaction.MIN_BYTES_INPUT) * numberOfActualStamps

        for (let i = 0; i < numberOfActualStamps; i++) {
            transactionBuilder.addOutput(outputAddress, config.postageRate.weight + Transaction.MIN_BYTES_INPUT)
        }
        const change = originalAmount - totalSatoshisToSend - txFee
        if (change > 1082) {
            transactionBuilder.addOutput(outputAddress, change)
        }

        // Sign the transaction with the HD node.
        let redeemScript
        for (let i = 0; i < utxos.length; i++) {
            transactionBuilder.sign(i, keyPair, redeemScript, transactionBuilder.hashTypes.SIGHASH_ALL, utxos[i].value)
        }

        const tx = transactionBuilder.build()
        const hex = tx.toHex()

        return hex
    }

    buildTransaction(incomingTransaction: any, stamps: any, keyPairFromPostOffice: any): Buffer {
        const newTransaction = TransactionBuilder.fromTransaction(incomingTransaction, config.network)
        const newTransactionHex = this.addStampsForTransactionAndSignInputs(newTransaction, keyPairFromPostOffice, stamps)
            .build()
            .toHex()
        return newTransactionHex
    }
    
}