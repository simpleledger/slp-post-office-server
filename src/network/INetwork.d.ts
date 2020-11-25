import INetUtxo from './INetUtxo'

export default interface INetwork {
    fetchUTXOsForStampGeneration: (cashAddress: string) => Promise<INetUtxo[]>
    fetchUTXOsForNumberOfStampsNeeded: (numberOfStamps: number, cashAddress: string) => Promise<INetUtxo[]>
    validateSLPInputs: (inputs: any) => Promise<void>
    broadcastTransaction: (rawTransaction: Buffer) => Promise<string>
}
