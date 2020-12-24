import bitcore from 'bitcore-lib-cash';
import * as bchaddr from 'bchaddrjs-slp';
import BigNumber from 'bignumber.js';

import { ServerConfig } from './Config';
import { Log } from './Log';
import errorMessages from './ErrorMessages';
import INetUtxo from './Network/INetUtxo';

export default class PostageTransaction {
    static MIN_BYTES_INPUT = 181
    static LOKAD_ID_INDEX = 1
    static TOKEN_ID_INDEX = 4
    static LOKAD_ID_INDEX_VALUE = '534c5000'
    static SLP_OP_RETURN_VOUT = 0
    static BCH_MAX_OUTPUTS = 2500;
    static BCH_P2PKH_OUTPUT_SIZE = 34;


    config: ServerConfig;

    constructor(config: ServerConfig) {
        this.config = config;
    }

    addStampsForTransaction(tx: bitcore.Transaction, stamps: INetUtxo[]): bitcore.Transaction {
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

        return tx;
    }

    signInputs(tx: bitcore.Transaction, stamps: INetUtxo[]): bitcore.Transaction {
        const lastSlpInputVin = tx.inputs.length - 1 - stamps.length;

        for (let i = lastSlpInputVin + 1; i <= stamps.length; i++) {
            Log.debug(`Signing... ${i}`);

            const signatures: bitcore.crypto.Signature[] = tx.inputs[i].getSignatures(tx, this.config.postage.hdNode.privateKey, i);

            if (signatures.length === 0) {
                throw new Error('Signature not found');
            }

            tx.applySignature(signatures[0]);
        }

        return tx;
    }

    getNeededStamps(tx: bitcore.Transaction): number {
        BigNumber.set({ ROUNDING_MODE: BigNumber.ROUND_UP }); // TODO why is this set here?

        const txScript = tx.outputs[PostageTransaction.SLP_OP_RETURN_VOUT].script.toASM().split(' ');

        if (txScript[PostageTransaction.LOKAD_ID_INDEX] !== PostageTransaction.LOKAD_ID_INDEX_VALUE) {
            throw new Error(errorMessages.INVALID_SLP_OP_RETURN);
        }

        let tokenOutputPostage = 0;
        for (let i = 1; i < tx.outputs.length; i++) {
            const addrFromOut = bchaddr.toSlpAddress(tx.outputs[i].script.toAddress().toString());

            // check if its our own deposit address
            if (this.config.postageRate.address === addrFromOut) {
                tokenOutputPostage = PostageTransaction.TOKEN_ID_INDEX + i;
            }
        }

        if (tokenOutputPostage === 0) {
            throw new Error(errorMessages.INSUFFICIENT_POSTAGE);
        }

        // Check if token being spent is the same as described in the postage rate for the stamp
        // Check if postage is being paid accordingly
        const postagePaymentTokenId = txScript[PostageTransaction.TOKEN_ID_INDEX];
        const stampDetails = this.config.postageRate.stamps
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

    splitUtxosIntoStamps(utxos: INetUtxo[]): bitcore.Transaction {
        const addr: bitcore.Address = this.config.postage.hdNode.privateKey.toAddress();

        const tx = new bitcore.Transaction()
            .from(utxos.map(u => new bitcore.Transaction.UnspentOutput({
                txid: u.tx_hash,
                vout: u.tx_pos,
                satoshis: u.value,
                script: u.script
            })));
        tx.feePerByte(1);

        const stampSize = this.config.postageRate.weight + PostageTransaction.MIN_BYTES_INPUT;

        const originalAmount = utxos.reduce((accumulator, utxo) => accumulator + utxo.value, 0);
        let numberOfPossibleStamps = Math.floor(originalAmount / stampSize);

        if (numberOfPossibleStamps > PostageTransaction.BCH_MAX_OUTPUTS) {
            numberOfPossibleStamps = PostageTransaction.BCH_MAX_OUTPUTS - 1;
        }
        
        for(let i=0; i < numberOfPossibleStamps; i++){
            // @ts-ignore
            let fee = tx._estimateSize();
            // @ts-ignore
            if (tx._getUnspentValue() - fee > stampSize + PostageTransaction.BCH_P2PKH_OUTPUT_SIZE) {
                tx.to(addr, stampSize);
            }
            if (i == numberOfPossibleStamps - 1){
                // @ts-ignore
                fee = tx._estimateSize();
                // @ts-ignore
                if (tx._getUnspentValue() - fee > bitcore.Transaction.DUST_AMOUNT + PostageTransaction.BCH_P2PKH_OUTPUT_SIZE) {
                    tx.change(addr);
                }
            }
        }        
        tx.sign(this.config.postage.hdNode.privateKey);

        return tx;
    }
}
