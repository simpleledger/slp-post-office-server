interface ITransactionConstructor {
    new (config: any): ITransaction;
}

export default interface ITransaction {
    addStampsForTransactionAndSignInputs: (transaction: any, keyPairFromPostOffice: any, stamps: any) => any;
    getNeededStamps: (transaction: any) => number;
    splitUtxosIntoStamps: (utxos: any, hdNode: any) => any;
    buildTransaction: (incomingTransaction: any, stamps: any, keyPairFromPostOffice: any) => Buffer;
}