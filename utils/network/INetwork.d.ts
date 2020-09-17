export default interface INetwork {
    fetchUTXOsForStampGeneration();
    fetchUTXOsForNumberOfStampsNeeded();
    validateSLPInputs: (inputs: any) => any;
    broadcastTransaction: (rawTransactionHex: string) => any;
}