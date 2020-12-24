import bitcore from 'bitcore-lib-cash';
import INetUtxo from './INetUtxo';
import { ServerConfig } from './../Config';

export default abstract class AbstractNetwork {
    constructor(config: ServerConfig) {}
    abstract fetchUTXOsForStampGeneration: (address: bitcore.Address) => Promise<INetUtxo[]>;
    abstract fetchUTXOsForNumberOfStampsNeeded: (numberOfStamps: number, address: bitcore.Address) => Promise<INetUtxo[]>;
    abstract validateSLPInputs: (inputs: bitcore.Transaction.Input[]) => Promise<void>;
    abstract broadcastTransaction: (rawTransaction: Buffer) => Promise<string>;
}
