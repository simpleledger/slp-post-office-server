import bitcore from 'bitcore-lib-cash';
import INetUtxo from './INetUtxo';
import { ServerConfig } from './../Config';

export default abstract class AbstractNetwork {
    constructor(config: ServerConfig) {}
    abstract fetchUTXOsForStampGeneration: (cashAddress: string) => Promise<INetUtxo[]>;
    abstract fetchUTXOsForNumberOfStampsNeeded: (numberOfStamps: number, cashAddress: string) => Promise<INetUtxo[]>;
    abstract validateSLPInputs: (inputs: bitcore.Transaction.Input[]) => Promise<void>;
    abstract broadcastTransaction: (rawTransaction: Buffer) => Promise<string>;
}
