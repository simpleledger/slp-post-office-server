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

    addStampsForTransactionAndSignInputs(tx: bitcore.Transaction, hdNode: bitcore.HDPrivateKey, stamps: INetUtxo[]): bitcore.Transaction {
        for (const stamp of stamps) {
            tx.addInput(new bitcore.Transaction.Input.PublicKeyHash({
                output: new bitcore.Transaction.Output({
                    script: stamp.script,
                    satoshis: stamp.value
                }),
                prevTxId: stamp.tx_hash,
                outputIndex: stamp.tx_pos,
                script: null
            }));
        }

        const lastSlpInputVin = tx.inputs.length - 1;
        for (let i = lastSlpInputVin + 1; i <= stamps.length; i++) {
            Log.debug(`Signing... ${i}`);
            const signature = tx.inputs[i].getSignatures(tx, hdNode.privateKey, i)[0];
            tx.applySignature(signature);
        }

        return tx;
    }

    getNeededStamps(tx: bitcore.Transaction): number {
        BigNumber.set({ ROUNDING_MODE: BigNumber.ROUND_UP }); // TODO why is this set here?

        const txScript = tx.outputs[Transaction.SLP_OP_RETURN_VOUT].script.toASM().split(' ');

        if (txScript[Transaction.LOKAD_ID_INDEX] !== Transaction.LOKAD_ID_INDEX_VALUE) {
            throw new Error(errorMessages.INVALID_SLP_OP_RETURN);
        }

        let tokenOutputPostage = 0;
        for (let i = 1; i < tx.outputs.length; i++) {
            const addrFromOut = bchaddr.toSlpAddress(tx.outputs[i].script.toAddress().toString());

            // check if its our own deposit address
            if (Config.postage.postageRate.address === addrFromOut) {
                tokenOutputPostage = Transaction.TOKEN_ID_INDEX + i;
            }
        }

        if (tokenOutputPostage === 0) {
            throw new Error(errorMessages.INSUFFICIENT_POSTAGE);
        }

        // Check if token being spent is the same as described in the postage rate for the stamp
        // Check if postage is being paid accordingly
        const postagePaymentTokenId = txScript[Transaction.TOKEN_ID_INDEX];
        const stampDetails = Config.postage.postageRate.stamps
            .filter(stamp => stamp.tokenId === postagePaymentTokenId)
            .pop() || false;

        const minimumStampsNeeded = tx.outputs.length - tx.inputs.length + 1;

        if (! stampDetails) {
            throw new Error(errorMessages.UNSUPPORTED_SLP_TOKEN);
        }

        const stampRate = new BigNumber(stampDetails.rate).times(10 ** stampDetails.decimals);
        const amountPostagePaid = new BigNumber(txScript[tokenOutputPostage], 16).times(
            10 ** stampDetails.decimals,
        );

        if (amountPostagePaid.isLessThan(stampRate.times(minimumStampsNeeded))) {
            throw new Error(errorMessages.INSUFFICIENT_POSTAGE);
        }

        return Number(amountPostagePaid.dividedBy(stampRate).toFixed(0));
    }

    splitUtxosIntoStamps(utxos: INetUtxo[], hdNode: bitcore.HDPrivateKey): bitcore.Transaction {
        const addr: bitcore.Address = hdNode.privateKey.toAddress();

        const tx = new bitcore.Transaction()
            .from(utxos.map(u => new bitcore.Transaction.UnspentOutput({
                txid: u.tx_hash,
                vout: u.tx_pos,
                satoshis: u.value,
                script: u.script
            })));
        tx.feePerByte(1);

        const stampSize = Config.postage.postageRate.weight + Transaction.MIN_BYTES_INPUT;

        const originalAmount = utxos.reduce((accumulator, utxo) => accumulator + utxo.value, 0);
        let numberOfPossibleStamps = Math.floor(originalAmount / stampSize);

        const BCH_MAX_OUTPUTS = 2500;
        const BCH_P2PKH_OUTPUT_SIZE = 34;

        if (numberOfPossibleStamps > BCH_MAX_OUTPUTS) {
            numberOfPossibleStamps = BCH_MAX_OUTPUTS - 1;
        }
        
        for(let i=0; i < numberOfPossibleStamps; i++){
            // @ts-ignore
            let fee = tx._estimateSize();
            // @ts-ignore
            if (tx._getUnspentValue() - fee > stampSize + BCH_P2PKH_OUTPUT_SIZE) {
                tx.to(addr, stampSize);
            }
            if (i == numberOfPossibleStamps - 1){
                // @ts-ignore
                fee = tx._estimateSize();
                // @ts-ignore
                if (tx._getUnspentValue() - fee > bitcore.Transaction.DUST_AMOUNT + BCH_P2PKH_OUTPUT_SIZE) {
                    tx.change(addr);
                }
            }
        }        
        tx.sign(hdNode.privateKey);

        return tx;
    }
}
