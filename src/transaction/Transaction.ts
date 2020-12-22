import errorMessages from '../errorMessages';
import bitcore from 'bitcore-lib-cash';
import * as bchaddr from 'bchaddrjs-slp';
import BigNumber from 'bignumber.js';
import ITransaction from './ITransaction';
import INetUtxo from '../network/INetUtxo';
import { Config } from './../config';
import { Log } from './../log';

export default class Transaction implements ITransaction {
    static MIN_BYTES_INPUT = 181
    static LOKAD_ID_INDEX = 1
    static TOKEN_ID_INDEX = 4
    static LOKAD_ID_INDEX_VALUE = '534c5000'
    static SLP_OP_RETURN_VOUT = 0

    addStampsForTransactionAndSignInputs(transaction: bitcore.Transaction, hdNode: bitcore.HDPrivateKey, stamps: INetUtxo[]): bitcore.Transaction {
        const lastSlpInputVin = transaction.inputs.length - 1;
        for (let i = 0; i < stamps.length; i++) {
            const stamp = stamps[i];
            const input = new bitcore.Transaction.Input.PublicKeyHash(
                {
                    output: new bitcore.Transaction.Output(
                        {
                            script: stamp.script,
                            satoshis: stamp.value
                        }),
                        prevTxId: stamp.tx_hash,
                        outputIndex: stamp.tx_pos,
                        script: null
                });
            transaction.addInput(input);
        }

        for (let i = lastSlpInputVin + 1; i <= stamps.length; i++) {
            Log.debug(`Signing... ${i}`);
            const signature = transaction.inputs[i].getSignatures(transaction, hdNode.privateKey, i)[0];
            transaction.applySignature(signature);
        }

        return transaction;
    }

    getNeededStamps(transaction: bitcore.Transaction): number {
        BigNumber.set({ ROUNDING_MODE: BigNumber.ROUND_UP });
        const transactionScript = transaction.outputs[Transaction.SLP_OP_RETURN_VOUT].script.toASM().split(' ');
        if (transactionScript[Transaction.LOKAD_ID_INDEX] !== Transaction.LOKAD_ID_INDEX_VALUE)
            throw new Error(errorMessages.INVALID_SLP_OP_RETURN);

        let neededStamps = 0;
        let tokenOutputPostage = 0;
        for (let i = 1; i < transaction.outputs.length; i++) {
            const addressFromOut = bchaddr.toSlpAddress(
                transaction.outputs[i].script.toAddress().toString()
            );
            const postOfficeAddress = Config.postage.postageRate.address;
            if (postOfficeAddress === addressFromOut) tokenOutputPostage = Transaction.TOKEN_ID_INDEX + i;
        }
        if (tokenOutputPostage === 0) throw new Error(errorMessages.INSUFFICIENT_POSTAGE);

        // Check if token being spent is the same as described in the postage rate for the stamp
        // Check if postage is being paid accordingly
        const postagePaymentTokenId = transactionScript[Transaction.TOKEN_ID_INDEX];
        const stampDetails =
            Config.postage.postageRate.stamps.filter(stamp => stamp.tokenId === postagePaymentTokenId).pop() || false;
        const minimumStampsNeeded = transaction.outputs.length - transaction.inputs.length + 1;
        if (stampDetails) {
            const stampRate = new BigNumber(stampDetails.rate).times(10 ** stampDetails.decimals);
            const amountPostagePaid = new BigNumber(transactionScript[tokenOutputPostage], 16).times(
                10 ** stampDetails.decimals,
            );
            if (amountPostagePaid.isLessThan(stampRate.times(minimumStampsNeeded))) {
                throw new Error(errorMessages.INSUFFICIENT_POSTAGE);
            }
            neededStamps = Number(amountPostagePaid.dividedBy(stampRate).toFixed(0));
        } else {
            throw new Error(errorMessages.UNSUPPORTED_SLP_TOKEN);
        }

        return neededStamps;
    }

    splitUtxosIntoStamps(utxos: INetUtxo[], hdNode: bitcore.HDPrivateKey): Buffer {
        const address: bitcore.Address = hdNode.privateKey.toAddress();

        const unspentOutputs: bitcore.Transaction.UnspentOutput[] = [];
        utxos.forEach(element => {
            const unspentOutput = new bitcore.Transaction.UnspentOutput({
                txid: element.tx_hash,
                vout: element.tx_pos,
                satoshis: element.value,
                script: element.script
            });
            unspentOutputs.push(unspentOutput);
        });
        const transaction = (new bitcore.Transaction()).from(unspentOutputs);

        const stampSize = Config.postage.postageRate.weight + Transaction.MIN_BYTES_INPUT;

        const originalAmount = utxos.reduce((accumulator, utxo) => accumulator + utxo.value, 0);
        let numberOfPossibleStamps = Math.floor(originalAmount / stampSize);

        const BCH_MAX_OUTPUTS = 2500;
        if (numberOfPossibleStamps > BCH_MAX_OUTPUTS) {
            numberOfPossibleStamps = BCH_MAX_OUTPUTS - 1;
        }
        
        transaction.feePerByte(1);
        for(let i=0; i < numberOfPossibleStamps; i++){
            // @ts-ignore
            let fee = transaction._estimateSize();
            // @ts-ignore
            let unspentValue = transaction._getUnspentValue();
            if (unspentValue - fee > stampSize + 34) {
                transaction.to(address, stampSize);
            }
            if (i == numberOfPossibleStamps - 1){
                // @ts-ignore
                fee = transaction._estimateSize();
                // @ts-ignore
                unspentValue = transaction._getUnspentValue();
                if (unspentValue - fee > 546 + 34) {
                    transaction.change(address);
                }
            }
        }        
        transaction.sign(hdNode.privateKey);
        
        return Buffer.from(transaction.serialize(), 'hex');
    }
}
