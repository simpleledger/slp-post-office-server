import BigNumber from 'bignumber.js';

interface IApiWrapperConstructor {
    new (): IApiWrapper;
}

export default interface IApiWrapper {
    getPrice: () => Promise<BigNumber>;
}
