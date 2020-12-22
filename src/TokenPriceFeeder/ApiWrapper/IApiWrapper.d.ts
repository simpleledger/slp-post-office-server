interface IApiWrapperConstructor {
    new (): IApiWrapper;
}

export default interface IApiWrapper {
    getPrice: () => Promise<number>;
}
