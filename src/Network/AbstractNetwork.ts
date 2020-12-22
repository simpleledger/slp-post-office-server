import bitcore from 'bitcore-lib-cash';
import INetUtxo from './INetUtxo';

export default abstract class AbstractNetwork {
    constructor() {}
    abstract fetchUTXOsForStampGeneration: (cashAddress: string) => Promise<INetUtxo[]>;
    abstract fetchUTXOsForNumberOfStampsNeeded: (numberOfStamps: number, cashAddress: string) => Promise<INetUtxo[]>;
    abstract validateSLPInputs: (inputs: bitcore.Transaction.Input[]) => Promise<void>;
    abstract broadcastTransaction: (rawTransaction: Buffer) => Promise<string>;
}
