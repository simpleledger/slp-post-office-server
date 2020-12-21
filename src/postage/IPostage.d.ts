interface IPostageConstructor {
    new (): IPostage;
}

export default interface IPostage {
    getRates: () => any;
    addStampsToTxAndBroadcast: (rawIncomingPayment: any) => any;
    generateStamps: () => void;
}
