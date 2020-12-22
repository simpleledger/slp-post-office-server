interface IPostageConstructor {
    new (): IPostage;
}

export default interface IPostage {
    addStampsToTxAndBroadcast: (rawIncomingPayment: Buffer) => any;
    generateStamps: () => void;
}
