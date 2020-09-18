export default interface INetwork {
    fetchUTXOsForStampGeneration: (cashAddress: string) => any;
    fetchUTXOsForNumberOfStampsNeeded: (numberOfStamps: number, cashAddress: string) => any;
    validateSLPInputs: (inputs: any) => any;
    broadcastTransaction: (rawTransactionHex: string) => any;
}