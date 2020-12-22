import bitcore from 'bitcore-lib-cash'
import INetUtxo from './INetUtxo'

export default interface INetwork {
    fetchUTXOsForStampGeneration: (cashAddress: string) => Promise<INetUtxo[]>;
    fetchUTXOsForNumberOfStampsNeeded: (numberOfStamps: number, cashAddress: string) => Promise<INetUtxo[]>;
    validateSLPInputs: (inputs: bitcore.Transaction.Input[]) => Promise<void>;
    broadcastTransaction: (rawTransaction: Buffer) => Promise<string>;
}
