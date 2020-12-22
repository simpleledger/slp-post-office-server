import bitcore from 'bitcore-lib-cash';
import INetUtxo from '../network/INetUtxo';

interface ITransactionConstructor {
    new (): ITransaction;
}

export default interface ITransaction {
    addStampsForTransactionAndSignInputs: (transaction: bitcore.Transaction, hdNode: bitcore.HDPrivateKey, stamps: INetUtxo[]) => bitcore.Transaction;
    getNeededStamps: (transaction: bitcore.Transaction) => number;
    splitUtxosIntoStamps: (utxos: INetUtxo[], hdNode: bitcore.HDPrivateKey) => bitcore.Transaction;
}
